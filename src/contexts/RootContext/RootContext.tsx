import { ethers } from 'ethers';
import Web3Modal from "web3modal";
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { ContextProviderProps } from "./types";
import { Log } from '@ethersproject/abstract-provider';
import { CryptoSol } from 'diamond-contracts-claiming/dist/api/src/cryptoSol';
import React, { createContext, useContext, useEffect, useState } from "react";
import ClaimContract from 'diamond-contracts-claiming/artifacts/contracts/ClaimContract.sol/ClaimContract.json';

interface RootContextProps {
  provider: any,
  claimApi: any,
  account: string | null,
  rootInitialized: boolean,

  ensureWalletConnection: () => boolean,
  handleErrorMsg: (err: Error, alternateMsg: string) => void,
  showLoader: (loading: boolean, loadingMsg: string) => void,
  connectWallet: () => Promise<{ provider: any } | undefined>,
  getClaimTxHash: (v3Address: string) => Promise<string | null>,
}

const RootContext = createContext<RootContextProps | undefined>(undefined);

const RootContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
  const [claimApi, setClaimApi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [account, setAccount] = useState<string | null>(null);
  const [claimContract, setClaimContract] = useState<any>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [rootInitialized, setRootInitialized] = useState<boolean>(false);
  const [provider, setProvider] = useState<any>(new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL));

  useEffect(() => {
    console.log("[INFO] Initializing Root Context");
    initialize();
  }, [account]);

  const showLoader = (loading: boolean, loadingMsg: string) => {
    setIsLoading(loading);
    setLoadingMessage(loadingMsg);
  }

  const initialize = async () => {
    if (!rootInitialized) {
      setRootInitialized(true);
    }

    getClaimContract().then((contract: any) => {
      setClaimContract(contract);
      setClaimApi(new CryptoSol(contract));
    });
  }

  const handleErrorMsg = (err: Error, alternateMsg: string) => {
    if (err.message && !err.message.includes("EVM") && (err.message.includes("MetaMask") || err.message.includes("rejected"))) {
      toast.error("Transaction rejected by user.");
    } else {
      toast.error(alternateMsg);
    }
  }

  const connectWallet = async (): Promise<any> => {
    try {
        const chainId = process.env.REACT_APP_CHAIN_ID || 27272;
        let chainIdHex = ethers.toBeHex(chainId);
        const url = process.env.REACT_APP_RPC_URL || "http://localhost:8545";
        const chainOptions: { [key: number]: string } = {
            [chainId]: url,
        };

        const providerOptions: any = {
            // walletconnect: {
            //     package: walletConnectProvider,
            //     options: {
            //         chainId,
            //         rpc: chainOptions,
            //     },
            // },
        };

        const web3Modal = new Web3Modal({
            network: "mainnet",
            cacheProvider: false,
            providerOptions,
        });

        // clear cache so on each connect it asks for wallet type
        web3Modal.clearCachedProvider();
        const web3ModalInstance = await web3Modal.connect();

        // handle account change
        web3ModalInstance.on("accountsChanged", function (accounts: string[]) {
            if (accounts.length === 0) {
                window.location.reload();
            } else {
                connectWallet();
            }
        });

        const provider = new ethers.BrowserProvider(web3ModalInstance);

        // force user to change to DMD network
        if (await web3ModalInstance.request({ method: 'eth_chainId' }) !== chainIdHex) {
          try {
            await web3ModalInstance.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: chainIdHex }],
            });
          } catch (err: any) {
            if (err.code === 4902) {
              await web3ModalInstance.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainName: process.env.REACT_APP_CHAIN_NAME || "DMD Diamond",
                    chainId: chainIdHex,
                    nativeCurrency: { name: "DMD", decimals: 18, symbol: "DMD" },
                    rpcUrls: [url],
                    blockExplorerUrls: null,
                  },
                ],
                
              });
            } else {
              console.error("[Wallet Connect] Other Error", err);
              return undefined;
            }
          }
        }

        const walletAddress = (await web3ModalInstance.request({ method: 'eth_requestAccounts' }))[0];
        setAccount(walletAddress); // Assuming setAccount is defined elsewhere
        setProvider(provider);

        return provider;
    } catch (err) {
        console.error("[Wallet Connect]", err);
        return undefined;
    }
  };

  const getClaimContract = async () => {
    let signer;
    const contractAddress = process.env.REACT_APP_CLAIMING_CONTRACT || '0xCAFa71b474541D1676093866088ccA4AB9a07722';

    try {
      signer = await provider.getSigner(0);
    } catch (e) {}
    
    return new ethers.Contract(
      contractAddress, 
      ClaimContract.abi,
      signer ? signer : provider
    );
  }

  const ensureWalletConnection = (): boolean => {
    if (!account) {
      toast.warn("Please connect your wallet to proceed.");
      return false;
    }
    return true;
  }

  const getClaimTxHash = async (v4Address: string): Promise<string | null> => {
    try {
        let eventFilter = claimContract.filters.Claim(v4Address);
        let logs: Log[] = await claimContract.queryFilter(eventFilter, Number(process.env.REACT_APP_CONTRACT_DEPLOY_BLOCK || 0));

        if (logs.length === 0) {
          return null;
        } else {
          const iface = new ethers.Interface(ClaimContract.abi);
          const latestLogs = logs
          .map((log) => {
            const parsedLog = iface.parseLog(log) as any;
            return {args: parsedLog.args, transactionHash: log.transactionHash};

          })
          .filter((parsedLog) => parsedLog?.args[0] === v4Address) as any;
          return latestLogs.length > 0 ? latestLogs[latestLogs.length - 1].transactionHash : null;
        }
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const contextValue = {
    account,
    provider,
    claimApi,
    rootInitialized,
    
    ensureWalletConnection,
    handleErrorMsg,
    getClaimTxHash,
    connectWallet,
    showLoader
  };

  return (
    <RootContext.Provider value={contextValue}>
      <Loader isLoading={isLoading} loadingMessage={loadingMessage}/>
      {children}
    </RootContext.Provider>
  );
};

const useRootContext = (): RootContextProps => {
  const context = useContext(RootContext);

  if (context === undefined) {
    throw new Error("Coudln't fetch Root Context");
  }

  return context;
};

export { RootContextProvider, useRootContext };