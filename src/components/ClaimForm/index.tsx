import BN from "bn.js";
import { ethers } from "ethers";
import { toast } from 'react-toastify';
import styles from "./styles.module.css";
import { MESSAGES } from "../../constants/messages";  
import { useEffect, useRef, useState } from "react";
import { useRootContext } from "../../contexts/RootContext/RootContext";

const ClaimForm = () => {
  const { showLoader, provider, claimApi, ensureWalletConnection, getClaimTxHash } = useRootContext();
  
  const [v3Address, setV3Address] = useState("");
  const [v4Address, setV4Address] = useState("");
  const [signedMessage, setSignedMessage] = useState("");
  const [claimError, setClaimError] = useState<string>("");
  const [claimedTxHash, setClaimedTxHash] = useState<string>("");
  const [claimSuccess, setClaimSuccess] = useState<boolean>(false);
  const [fetchingBalance, setFetchingBalance] = useState<boolean>(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [claimableBalance, setClaimableBalance] = useState<string | null>();
  const [validV3Address, setValidV3Address] = useState<boolean | null>(null);
  const [validV4Address, setValidV4Address] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      if (!v3Address || v3Address.length !== 34) return;
      console.log("[INFO] Checking balance...");
      checkForBalance();
    } catch (e) {}
  }, [v3Address]);

  const checkForBalance = async () => {
    try {
      setFetchingBalance(true);
      const v4Address = await claimApi.getDmdV4Address(v3Address);
      console.log({v4Address})
      setValidV3Address(true);
      getClaimTxHash(v4Address).then(async (res: string | null) => {
        if (res) {
        // if (!res) {
          setClaimError("");
          setClaimedTxHash(res || "");
          setClaimableBalance(null);
        } else {
          await claimApi.getBalance(v3Address).then((res: BN) => {
            if (res > new BN(ethers.parseEther("1").toString())) {
              setClaimError("");
              setClaimedTxHash("");
              setClaimableBalance(ethers.formatEther(res.toString()));
            } else {
              setClaimedTxHash("");
              setClaimableBalance(null);
              setClaimError(
                MESSAGES.snapshotBalanceError
              );
            }
          });
        }
        setFetchingBalance(false);
      });
    } catch(err: any) {
      if (err.message.includes("Non-base58") || err.message.includes("Invalid")) {
        toast.error(MESSAGES.invalidAddress);
      } else {
        console.log("[ERROR] Err", err);
      }
      setClaimedTxHash("");
      setValidV3Address(false);
      setClaimableBalance(null);
      setFetchingBalance(false);
    }
  };

  const claimSubmit = async (e: any) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    showLoader(true, "Claiming...");
    const toastid = toast.loading("");
    const postFix = signedMessage.split(v4Address)[1] || "";

    claimApi.claim(v4Address, signedMessage, postFix, true).then(async (res: any) => {
      showLoader(false, "");
      setSignatureError(null);
      if (res.success) {
        setClaimSuccess(true);
        await checkForBalance();
        toast.update(toastid, { render: MESSAGES.claimSuccess, type: "success", isLoading: false, autoClose: 5000 });
      } else {
        let errMsg = MESSAGES.claimError;
        if (res.msg && res.msg.includes("signature")) 
        {
          errMsg = res.msg.charAt(0).toUpperCase() + res.msg.slice(1);
          setSignatureError(
            MESSAGES.signatureError
          );
        }
        if (res.msg && res.msg.includes("rejected")) errMsg = res.msg.charAt(0).toUpperCase() + res.msg.slice(1);
        toast.update(toastid, { render: errMsg, type: "error", isLoading: false, autoClose: 5000 });
      }
    });
  };

  const copyToClipboard = () => {
    const claimMessagePrefix = document.getElementById("claimMessagePrefix") as HTMLInputElement | HTMLTextAreaElement | null;
    if (claimMessagePrefix) {

      claimMessagePrefix.select();
      // For mobile devices
      claimMessagePrefix.setSelectionRange(0, 99999);

      // Copy the text inside the text field
      navigator.clipboard.writeText(claimMessagePrefix.placeholder);

      toast.success(MESSAGES.copiedToClipboard);
    }
  };

  const handleV4AddressChange = (e: any) => {
    try {
      if (ethers.getAddress(e.target.value)) {
        setValidV4Address(true);
      } else {
        setValidV4Address(false);
      }
    } catch (err) {
      setValidV4Address(false);
    }

    setV4Address(e.target.value);
  }

  const handleSignatureChange = async (newVal: any) => {
    try {
      const prefixString = await claimApi.prefixString();
      const postFix = signedMessage.split(v4Address)[1] || "";
      claimApi.cryptoJS.getPublicKeyFromSignature(
        newVal,
        prefixString + v4Address + postFix,
        true
      );
      setSignatureError(null);
    } catch (err) {
      setSignatureError(
        MESSAGES.signatureError
      );
    }

    setSignedMessage(newVal);
  }

  // Prevent form submission if Enter key is pressed
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className={styles.navbar}>
      <form className="claimForm" onSubmit={claimSubmit} onKeyDown={handleKeyDown}>
        <div>
          <input
            placeholder="Please specify your v3 address"
            onChange={(e) => setV3Address(e.target.value)}
            required
            minLength={34}
            maxLength={34}
          />

          {validV3Address === false && (
            <p className={styles.redText}>
              {MESSAGES.invalidV3Address}
            </p>
          )}
        </div>

        {claimableBalance || fetchingBalance ? (
          <div>
            {
              fetchingBalance ? (
                <p>{MESSAGES.fetchingBalance}</p>
              ) : (
                <p>{MESSAGES.claimableDmd} {claimableBalance?.toString()} DMD</p>
              )
            }
          </div>
        ) : claimedTxHash ? claimSuccess ? (<div>
          <p className={styles.greenText}>
            Claimed successfully! Please check the transaction here{" "}
            <a
              href={process.env.REACT_APP_EXPLORER_TX_URL + claimedTxHash}
              target="_blank"
            >
              [link]
            </a>
          </p>
        </div>) :
         (
          <div>
            <p className={styles.redText}>
              {MESSAGES.alreadyClaimed}
              <a
                href={process.env.REACT_APP_EXPLORER_TX_URL + claimedTxHash}
                target="_blank"
              >
                [link]
              </a>
            </p>
          </div>
        ) : (
          <div>
            <p className={styles.redText}>{claimError}</p>
          </div>
        )}

        {claimableBalance && (
          <div>
            <input
              placeholder="Please specify your v4 address"
              onChange={(e) => handleV4AddressChange(e)}
              required
              minLength={42}
              maxLength={42}
            />
            {validV4Address === false && (
              <p className={styles.redText}>
                {MESSAGES.invalidV4Address}
              </p>
            )}
          </div>
        )}

        {validV4Address && claimableBalance && (
          <div className={styles.inputContainer}>
            <textarea
              id="claimMessagePrefix"
              // value={process.env.REACT_APP_CLAIM_MESSAGE_PREFIX + v4Address}
              placeholder={process.env.REACT_APP_CLAIM_MESSAGE_PREFIX + v4Address}
            />
            <button
              type="button"
              className={styles.copyButton}
              onClick={copyToClipboard}
            >
              Copy
            </button>
          </div>
        )}

        {validV4Address && claimableBalance && (
          <div>
            <input
              placeholder="Please provide the signature you've generated"
              onChange={(e) => handleSignatureChange(e.target.value)}
              required
            />

            <p className={styles.redText}>{signatureError}</p>
          </div>
        )}

        {validV4Address && claimableBalance && signedMessage && (
          <button disabled={
            claimableBalance && !signatureError && parseFloat(claimableBalance) > -1
              ? false
              : true
          } className={styles.claimButton}>
            <div className={styles.svgWrapper1}>
                <div className={styles.svgWrapper}>
                    <span className={styles.diamond}>
                        💎
                    </span>
                </div>
            </div>
            <span>Claim</span>
          </button>
        )}
      </form>
    </div>
  );
};

export default ClaimForm;
