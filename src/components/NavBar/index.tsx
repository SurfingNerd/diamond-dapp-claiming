import { useRootContext } from '../../contexts/RootContext/RootContext';
import styles from './styles.module.css';
import { useEffect, useState } from 'react';

const Navbar = () => {
    const { account, connectWallet } = useRootContext();

    return (
        <div className={styles.navbar}>
            <button className={styles.navConnectBtn} onClick={connectWallet}>
                {account ? account : 'Connect Wallet'}
            </button>
        </div>
    );
}

export default Navbar;