import BN from "bn.js";
import { ethers } from "ethers";
import { toast } from 'react-toastify';
import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import { useRootContext } from "../../contexts/RootContext/RootContext";

const ClaimForm = () => {
  const { showLoader, provider, claimApi, ensureWalletConnection } = useRootContext();

  const [postFix, setPostFix] = useState("");
  const [v3Address, setV3Address] = useState("");
  const [v4Address, setV4Address] = useState("");
  const [signedMessage, setSignedMessage] = useState("");
  const [balance, setBalance] = useState<string | null>();

  useEffect(() => {
    if (v4Address && signedMessage) {
      checkForBalance(v4Address, signedMessage).then((res: BN) => {
        setBalance(ethers.formatEther(res.toString()));
      });
    }
  }, [v4Address, postFix, signedMessage]);

  const checkForBalance = async (v4Address: string, signature: string): Promise<BN> => {
    try {
      const v3Address = await claimApi.getDmdV3Address(v4Address, signature, postFix, true);
      setV3Address(v3Address);
      return await claimApi.getBalance(v3Address);   
    } catch (e) {
      console.log(e)
      return new BN(0);
    }
  };

  const claimSubmit = async (e: any) => {
    e.preventDefault();
    if (!ensureWalletConnection()) return;

    showLoader(true, "Claiming...");
    const toastid = toast.loading("");

    claimApi.claim(v4Address, signedMessage, postFix, true).then(async (res: any) => {
      showLoader(false, "");
      if (res.success) {
        await checkForBalance(v4Address, signedMessage).then((res: BN) => {
          setBalance(ethers.formatEther(res.toString()));
        });
        toast.update(toastid, { render: "Claimed successfully!", type: "success", isLoading: false, autoClose: 5000 });
      } else {
        let errMsg = "Incorrect V4 address, postfix or signature. Please try again.";
        if (res.msg && res.msg.includes("rejected")) errMsg = res.msg.charAt(0).toUpperCase() + res.msg.slice(1);
        toast.update(toastid, { render: errMsg, type: "error", isLoading: false, autoClose: 5000 });
      }
    });
  };

  return (
    <div className={styles.navbar}>
      <form className="claimForm" onSubmit={claimSubmit}>
        <input
          placeholder="V4 Address"
          onChange={(e) => setV4Address(e.target.value)}
          required
          minLength={42}
          maxLength={42}
        />
        <input
          placeholder="Postfix (Optional)"
          onChange={(e) => setPostFix(e.target.value)}
        />
        <input
          placeholder="Signed Message"
          onChange={(e) => setSignedMessage(e.target.value)}
          required
        />
        {balance && (
          <div>
          <p>
            Claimable:{" "}
            {balance.toString()} DMD
          </p>
          <p>
            v3Address:{" "}
            {v3Address}
          </p>
          </div>
        )}
        <button disabled={balance && parseFloat(balance) > 0 ? false : true}>Claim</button>
      </form>
    </div>
  );
};

export default ClaimForm;
