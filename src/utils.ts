import bs58check from "bs58check";
import EC from "elliptic";
import BN from "bn.js";
import varuint from "varuint-bitcoin";
import bitcoinMessage from "bitcoinjs-message";
import * as bitcoin from "bitcoinjs-lib";
import * as secp256k1 from "secp256k1";
import { ethers } from "ethers";
import { ClaimContract } from "./typechain-types";

let base58check = require("base58check");

const SEGWIT_TYPES = {
  P2WPKH: "p2wpkh",
  P2SH_P2WPKH: "p2sh(p2wpkh)",
};

export function remove0x(input: string) {
  if (input.startsWith("0x")) {
    return input.substring(2);
  }
  return input;
}

export function ensure0x(input: string | Buffer) {
  if (input instanceof Buffer) {
    input = input.toString("hex");
  }

  if (!input.startsWith("0x")) {
    return "0x" + input;
  }
  return input;
}

export function toHexString(input: bigint) {
  return "0x" + input.toString(16);
}

export function hexToBuf(input: string): Buffer {
  if (input == null) {
    return Buffer.alloc(0);
  }

  return Buffer.from(remove0x(input), "hex");
}

// appends a prefix to inputBuffer.
export function prefixBuf(inputBuffer: Buffer, prefixHexString: string) {
  const prefix = hexToBuf(prefixHexString);
  return Buffer.concat([prefix, inputBuffer]);
}

export function stringToUTF8Hex(input: string): string {
  return ensure0x(Buffer.from(input, "utf8"));
}

export class DMDClaimingHelpers {
  private logDebug: boolean = false;

  public constructor() {}

  public setLogDebug(value: boolean) {
    this.logDebug = value;
  }

  private log(message: string, ...params: any[]) {
    if (this.logDebug) {
      console.log(message, ...params);
    }
  }

  /**
   * returns the DMD Diamond V3 address from the public key.
   * @param x x coordinate of the public key, with prefix 0x
   * @param y y coordinate of the public key, with prefix 0x
   */
  public publicKeyToBitcoinAddress(publicKey: string): string {
    // const hash = bitcoinMessage.magicHash(publicKeyBuffer, CryptoJS.getSignaturePrefix(false));
    // const publicKey = secp256k1.publicKeyConvert(publicKeyBuffer, true);
    //const address = bitcoinMessage.pubKeyToAddress(publicKey, true);
    //return address;

    //const publicKeyBuffer = Buffer.from(x.slice(2) + y.slice(2), 'hex');

    const pubkey = Buffer.from(remove0x(publicKey), "hex");
    const { address } = bitcoin.payments.p2pkh({ pubkey });

    return address!;
    // todo: support DMD here
    let network = bitcoin.networks.bitcoin;

    //return bitcoin.address.fromOutputScript(publicKeyBuffer, network);
    // Parse the public key
    //const publicKey = Buffer.from(publicKeyBuffer);

    // Generate the Bitcoin address
    //const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer });
  }

  /**
   *
   * @param address dmd or bitcoin style address.
   * @return Buffer with the significant bytes of the public key, not including the version number prefix, or the checksum postfix.
   */
  public dmdAddressToRipeResult(address: string): Buffer {
    this.log("address:", address);
    const decoded = bs58check.decode(address);

    // Assume first byte is version number
    let buffer = Buffer.from(decoded.slice(1));
    return buffer;
  }

  public signatureBase64ToRSV(signatureBase64: string): {
    r: Buffer;
    s: Buffer;
  } {
    const sig = Buffer.from(signatureBase64, "base64");

    this.log("sigBuffer:");
    this.log(sig.toString("hex"));

    const sizeOfRComponent = sig[0];
    if (sizeOfRComponent !== 32) {
      this.log(
        `invalid size of R in signature: ${sizeOfRComponent}:`,
        signatureBase64
      );
    }

    const rStart = 1; // r Start is always one (1).
    const sStart = 1 + sizeOfRComponent;
    const sizeOfSComponent = sig.length - sStart;

    if (sizeOfSComponent !== 32) {
      this.log(
        `invalid size of S in signature: ${sizeOfRComponent}:`,
        signatureBase64
      );
    }

    if (sizeOfRComponent > sig.length) {
      throw new Error("sizeOfRComponent is too Big!!");
    }
    const r = sig.subarray(rStart, rStart + sizeOfRComponent);
    const s = sig.subarray(sStart, 65);

    this.log(`r: ${r.toString("hex")}`);
    this.log(`s: ${s.toString("hex")}`);

    //bitcoinjs-lib

    return { r, s };
  }

  public decodeSignature(buffer: Buffer) {
    if (buffer.length !== 65) throw new Error("Invalid signature length");

    const flagByte = buffer.readUInt8(0) - 27;
    if (flagByte > 15 || flagByte < 0) {
      throw new Error("Invalid signature parameter");
    }

    return {
      compressed: !!(flagByte & 12),
      segwitType: !(flagByte & 8)
        ? null
        : !(flagByte & 4)
        ? SEGWIT_TYPES.P2SH_P2WPKH
        : SEGWIT_TYPES.P2WPKH,
      recovery: flagByte & 3,
      signature: buffer.slice(1),
    };
  }

  public getPublicKeyFromSignature(
    signatureBase64: string,
    messageContent: string,
    isDMDSigned: boolean
  ): { publicKey: string; x: string; y: string } {
    //const signatureBase64 = "IBHr8AT4TZrOQSohdQhZEJmv65ZYiPzHhkOxNaOpl1wKM/2FWpraeT8L9TaphHI1zt5bI3pkqxdWGcUoUw0/lTo=";
    //const address = "";

    const signature = Buffer.from(signatureBase64, "base64");

    const parsed = this.decodeSignature(signature);
    //this.log('parsed Signature:', parsed);

    // todo: add support for DMD specific signing prefix
    const hash = bitcoinMessage.magicHash(
      messageContent,
      DMDClaimingHelpers.getSignaturePrefix(isDMDSigned)
    );

    const publicKey = secp256k1.ecdsaRecover(
      parsed.signature,
      parsed.recovery,
      hash,
      parsed.compressed
    );

    //we now have the public key
    //public key is the X Value with a prefix.
    //it's 02 or 03 prefix, depending if y is ODD or not.
    this.log("publicKey: ", ethers.hexlify(publicKey));

    var ec = new EC.ec("secp256k1");

    const key = ec.keyFromPublic(publicKey);
    //const x = ethers.hexlify(publicKey.slice(1));
    //this.log("x: " + x);
    const x = ensure0x(key.getPublic().getX().toString("hex"));
    const y = ensure0x(key.getPublic().getY().toString("hex"));

    this.log("y: " + y);

    return { publicKey: ethers.hexlify(publicKey), x, y };
  }

  public getXYfromPublicKeyHex(publicKeyHex: string): { x: BN; y: BN } {
    var ec = new EC.ec("secp256k1");
    var publicKey = ec
      .keyFromPublic(publicKeyHex.toLowerCase(), "hex")
      .getPublic();
    var x = publicKey.getX();
    var y = publicKey.getY();

    //this.log("pub key:" + publicKey.toString('hex'));
    //this.log("x :" + x.toString('hex'));
    //this.log("y :" + y.toString('hex'));
    return { x, y };
  }

  public bitcoinAddressEssentialToFullQualifiedAddress(
    essentialPart: string,
    addressPrefix = "00"
  ) {
    // this.log('PublicKeyToBitcoinAddress:', essentialPart);
    let result = hexToBuf(essentialPart);
    result = prefixBuf(result, addressPrefix);
    //this.log('with prefix: ' + result.toString('hex'));

    return bs58check.encode(result);
  }

  /// creates a DMD Diamond Address from a RIPEMD-160 hash
  public ripeToDMDAddress(ripe160Hash: Buffer): string {
    // Prepend the version byte

    let buff = prefixBuf(ripe160Hash, "5a");
    //this.log('with prefix: ' + result.toString('hex'));

    return bs58check.encode(buff);
  }

  public getSignedMessage(messagePrefix: string, message: string): Buffer {
    const messagePrefixBuffer = Buffer.from(messagePrefix, "utf8");
    const messageBuffer = Buffer.from(message, "utf8");
    const messageVISize = varuint.encodingLength(message.length);

    const buffer = Buffer.alloc(
      messagePrefix.length + messageVISize + message.length
    );

    messagePrefixBuffer.copy(buffer, 0);
    varuint.encode(message.length, buffer, messagePrefix.length);
    messageBuffer.copy(buffer, messagePrefix.length + messageVISize);
    return buffer;
  }

  public static getSignaturePrefix(isDMDSigned: boolean): string {
    return isDMDSigned
      ? "\u0018Diamond Signed Message:\n"
      : "\u0018Bitcoin Signed Message:\n";
  }

  public getDMDSignedMessage(message: string): Buffer {
    return this.getSignedMessage(
      DMDClaimingHelpers.getSignaturePrefix(true),
      message
    );
  }

  public getBitcoinSignedMessage(message: string): Buffer {
    return this.getSignedMessage(
      DMDClaimingHelpers.getSignaturePrefix(false),
      message
    );
  }
}

export class DMDClaimingAPI {
  public cryptoJS = new DMDClaimingHelpers();

  private logDebug: boolean = false;

  // public static async fromContractAddress(contractAddress: string): Promise<DMDClaimingAPI> {

  //     const provider = new ethers.JsonRpcProvider();
  //     const contract: any = await provider.getContract("ClaimContract", contractAddress);
  //     return new DMDClaimingAPI(contract);
  // }

  /// Creates an instance if you already have a ClaimContract instance.
  /// use static method fromContractAddress() for creating an instance from a contract address.
  public constructor(public contract: ClaimContract) {
    if (contract === undefined || contract === null) {
      throw Error("Claim contract must be defined!!");
    }
  }

  /// claims the DMDv3 address with the given signature.
  /// @param dmdV4Address The DMDv4 address to claim.
  /// @param signature The signature of the claim, made with a DMDv3 wallet.
  /// @param postfix optional postfix to add to the claim message.
  /// @param dmdSig true if the signature is made with a DMD wallet, false if it is made with a Bitcoin wallet.
  public async claim(
    dmdV4Address: string,
    signature: string,
    postfix: string,
    dmdSig: boolean
  ) {
    try {
      let postfixHex = stringToUTF8Hex(postfix);

      const claimMessage = await this.contract.createClaimMessage(
        dmdV4Address,
        true,
        postfixHex,
        dmdSig
      );
      this.log("Claim Message: ", claimMessage);

      let prefixString = await this.prefixString();
      const pubkey = this.cryptoJS.getPublicKeyFromSignature(
        signature,
        prefixString + dmdV4Address + postfix,
        dmdSig
      );

      const rs = this.cryptoJS.signatureBase64ToRSV(signature);

      let pubKeyX = ensure0x(pubkey.x);
      let pubKeyY = ensure0x(pubkey.y);

      this.log("pub key x:", pubKeyX);
      this.log("pub key y:", pubKeyY);

      let dmdV3AddressFromSignaturesHex =
        await this.contract.publicKeyToBitcoinAddress(pubKeyX, pubKeyY, 1);

      this.log(
        "dmdV3AddressFromSignaturesHex:   ",
        dmdV3AddressFromSignaturesHex
      );
      this.log(
        "dmdV3AddressFromSignaturesBase58:",
        base58check.encode(remove0x(dmdV3AddressFromSignaturesHex))
      );

      let v = await this.recoverV(
        dmdV4Address,
        true,
        postfixHex,
        pubKeyX,
        pubKeyY,
        rs.r,
        rs.s,
        dmdSig
      );

      // throws error if tx is going to fail
      await this.contract.claim.estimateGas(
        dmdV4Address,
        true,
        postfixHex,
        pubKeyX,
        pubKeyY,
        v,
        rs.r,
        rs.s,
        dmdSig,
        { gasLimit: 200_000, gasPrice: "1000000000" }
      );

      let claimOperation = this.contract.claim(
        dmdV4Address,
        true,
        postfixHex,
        pubKeyX,
        pubKeyY,
        v,
        rs.r,
        rs.s,
        dmdSig,
        { gasLimit: 200_000, gasPrice: "1000000000" }
      );
      let receipt = await (await claimOperation).wait();
      return { success: true, msg: receipt};
    } catch(err: any) {
      return { success: false, msg: err.shortMessage || err.message }
    }
  }

  /// Recovers the V value of the signature by probing the 2 possible values.
  /// throws an error if the signature does not match.
  public async recoverV(
    dmdV4Address: string,
    claimAddressChecksum: boolean,
    postfixHex: string,
    pubKeyX: string,
    pubKeyY: string,
    r: Buffer,
    s: Buffer,
    dmdSig: boolean
  ): Promise<string> {
    if (
      await this.contract.claimMessageMatchesSignature(
        dmdV4Address,
        claimAddressChecksum,
        postfixHex,
        pubKeyX,
        pubKeyY,
        "0x1b",
        r,
        s,
        dmdSig
      )
    ) {
      return "0x1b";
    }

    if (
      await this.contract.claimMessageMatchesSignature(
        dmdV4Address,
        claimAddressChecksum,
        postfixHex,
        pubKeyX,
        pubKeyY,
        "0x1c",
        r,
        s,
        dmdSig
      )
    ) {
      return "0x1c";
    }

    throw Error("Could not match signature");
  }

  public setLogDebug(value: boolean) {
    this.logDebug = value;
    this.cryptoJS.setLogDebug(value);
  }

  // private async ensurePrefixCache() {
  //   if (this.prefixCache === '') {
  //     this.prefixCache = await this.prefixString();
  //   }
  // }

  private log(message: string, ...params: any[]) {
    if (this.logDebug) {
      console.log(message, ...params);
    }
  }

  /**
   * Retrieves the message that is used for hashing in bitcoin. (enpacking it with the Envolope)
   * see also: https://bitcoin.stackexchange.com/questions/77324/how-are-bitcoin-signed-messages-generated
   * @param address Ethereum style address, include checksum information.
   */
  public async addressToClaimMessage(
    address: string,
    postfix: string = "",
    dmdSig: boolean = false
  ): Promise<string> {
    const postfixHex = stringToUTF8Hex(postfix);

    const claimMessage = await this.contract.createClaimMessage(
      address,
      true,
      postfixHex,
      dmdSig
    );
    this.log("Claim Message:");
    this.log(claimMessage);
    return claimMessage;
  }

  /// Returns the Sha256 hash of the given message,
  /// using the contract to do so.
  public async messageToHash(messageString: string) {
    const buffer = Buffer.from(messageString, "utf-8");
    const hash = await this.contract.calcHash256(buffer.toString("hex"), {});
    this.log("messageToHash");
    this.log(hash);
    return hash;
  }

  /// test if a claim message matches a signature.
  public async claimMessageMatchesSignature(
    claimToAddress: string,
    addressContainsChecksum: boolean,
    postfix: string,
    pubkeyX: string,
    pubkeyY: string,
    sigV: string,
    sigR: string,
    sigS: string,
    dmd: boolean
  ): Promise<boolean> {
    const result = await this.contract.claimMessageMatchesSignature(
      claimToAddress,
      addressContainsChecksum,
      stringToUTF8Hex(postfix),
      ensure0x(pubkeyX),
      ensure0x(pubkeyY),
      ensure0x(sigV),
      ensure0x(sigR),
      ensure0x(sigS),
      dmd
    );
    this.log("Claim Result: ", result);
    return result;
  }

  /// Returns the Ethereum address of the given signature.
  public async getEthAddressFromSignature(
    claimToAddress: string,
    addressContainsChecksum: boolean,
    postfix: string,
    sigV: string,
    sigR: string | Buffer,
    sigS: string | Buffer,
    dmd: boolean
  ): Promise<string> {
    return this.contract.getEthAddressFromSignature(
      claimToAddress,
      addressContainsChecksum,
      stringToUTF8Hex(postfix),
      ensure0x(sigV),
      ensure0x(sigR),
      ensure0x(sigS),
      dmd
    );
  }

  /**
   * returns the essential part of a Bitcoin-style legacy compressed address associated with the given ECDSA public key
   * @param x X coordinate of the ECDSA public key
   * @param y Y coordinate of the ECDSA public key
   * @returns Hex string holding the essential part of the legacy compressed address associated with the given ECDSA public key
   */
  async publicKeyToBitcoinAddressEssential(
    x: bigint,
    y: bigint
  ): Promise<string> {
    const legacyCompressedEnumValue = 1;

    return this.contract.publicKeyToBitcoinAddress(
      toHexString(x),
      toHexString(y),
      legacyCompressedEnumValue
    );
  }

  async publicKeyToBitcoinAddress(x: bigint, y: bigint, addressPrefix: string) {
    const essentialPart = await this.publicKeyToBitcoinAddressEssential(x, y);
    return this.cryptoJS.bitcoinAddressEssentialToFullQualifiedAddress(
      essentialPart,
      addressPrefix
    );
  }

  /// return the ethereum pseudo address of the deployed contract as UTF-8.
  public async pubKeyToEthAddress(x: string, y: string) {
    return this.contract.pubKeyToEthAddress(x, y);
  }

  /// return the prefix string of the deployed contract as UTF-8.
  public async prefixString() {
    const bytes = await this.contract.prefixStr();
    const buffer = hexToBuf(bytes);
    return new TextDecoder("utf-8").decode(buffer);
  }

  /// adds additional balance to the contract.
  public async addBalance(dmdV3Address: string, value: string) {
    //   const signers = await ethers.getSigners();
    //   const fromAccount = signers[0];

    const ripe = this.cryptoJS.dmdAddressToRipeResult(dmdV3Address);
    return ensure0x(ripe);
    //   return (await this.contract.connect(fromAccount).addBalance(ensure0x(ripe), { value: value })).wait();
  }

  /// Returns the balance of the given DMD V3 address.
  public async getBalance(dmdV3Address: string): Promise<bigint> {
    const ripe = this.cryptoJS.dmdAddressToRipeResult(dmdV3Address);
    return this.contract.balances(ensure0x(ripe));
  }

  /// Returns the total balance of the claiming pot.
  public async getContractBalance(): Promise<bigint> {
    const address = await this.contract.getAddress();
    // get the balance of ths address.

    //   return ethers.provider.getBalance(address);
    return BigInt(0);
  }

  public async getDmdV3Address(dmdV4Address: string, signature: string, postfix: string, dmdSig: boolean): Promise<string> {
    let prefixString = await this.prefixString();
    const pubkey = this.cryptoJS.getPublicKeyFromSignature(
      signature,
      prefixString + dmdV4Address + postfix,
      dmdSig
    );
    const ripe = await this.contract.publicKeyToBitcoinAddress(pubkey.x, pubkey.y, 1);
    return this.cryptoJS.ripeToDMDAddress(Buffer.from(ripe.substring(2), "hex"));
  }

  public async getDmdV4Address(v3Address: string): Promise<string> {
    const ripe = this.cryptoJS.dmdAddressToRipeResult(v3Address);
    return ensure0x(ripe);
  }
}
