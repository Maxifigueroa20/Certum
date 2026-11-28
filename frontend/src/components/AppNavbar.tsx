import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { toast } from "sonner";
import type { WalletOption } from "../hooks/useWalletConnection";
import { solanaV1Client } from "../providers/SolanaProvider";
import { CertumLogo } from "./CertumLogo";
import { ThemeToggle } from "./ThemeToggle";

type AppNavbarProps = {
  shortAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isWalletReady: boolean;
  wallets: readonly WalletOption[];
  onConnectPreferred: () => void;
  onConnectWallet: (wallet: WalletOption) => void;
  onDisconnect: () => void;
};

export function AppNavbar({
  shortAddress,
  isConnected,
  isConnecting,
  isWalletReady,
  wallets,
  onConnectPreferred,
  onConnectWallet,
  onDisconnect,
}: AppNavbarProps) {
  const collapseRef = useRef<HTMLDivElement | null>(null);
  const [devnetSlot, setDevnetSlot] = useState<bigint | null>(null);
  const [devnetOnline, setDevnetOnline] = useState(true);
  const [isPinging, setIsPinging] = useState(false);

  const checkDevnet = useCallback(async (notify: boolean) => {
    setIsPinging(true);
    try {
      const slot = await solanaV1Client.rpc.getSlot().send();
      setDevnetSlot(slot);
      setDevnetOnline(true);
      if (notify) {
        toast.success(`Solana Devnet online (Slot #${slot.toLocaleString()})`);
      }
    } catch {
      setDevnetOnline(false);
      if (notify) {
        toast.error("Unable to reach Solana Devnet RPC right now.");
      }
    } finally {
      setIsPinging(false);
    }
  }, []);

  useEffect(() => {
    void checkDevnet(false);
    const interval = window.setInterval(() => {
      void checkDevnet(false);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [checkDevnet]);

  function collapseMobileMenu() {
    if (collapseRef.current?.classList.contains("show")) {
      collapseRef.current.classList.remove("show");
    }
  }

  return (
    <header className="certum-navbar sticky-top">
      <nav className="navbar navbar-expand-lg py-2" aria-label="Primary navigation">
        <div className="container">
          <NavLink
            className="navbar-brand d-flex align-items-center gap-2 text-decoration-none"
            to="/"
            onClick={collapseMobileMenu}
          >
            <CertumLogo size={34} />
            <span className="certum-display fw-bold fs-4" style={{ color: "var(--text)" }}>
              Certum
            </span>
          </NavLink>

          <div className="d-flex align-items-center gap-2 d-lg-none">
            <ThemeToggle />
            <button
              className="certum-icon-btn"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#certumNavbarContent"
              aria-controls="certumNavbarContent"
              aria-expanded="false"
              aria-label="Toggle navigation menu"
            >
              <i className="bi bi-list fs-5" aria-hidden="true" />
            </button>
          </div>

          <div
            ref={collapseRef}
            className="collapse navbar-collapse"
            id="certumNavbarContent"
          >
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-lg-4 ms-lg-5 pt-2 pt-lg-0">
              <li className="nav-item">
                <NavLink
                  to="/"
                  end
                  onClick={collapseMobileMenu}
                  className={({ isActive }) =>
                    `certum-nav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  Overview
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/issue"
                  onClick={collapseMobileMenu}
                  className={({ isActive }) =>
                    `certum-nav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  Issue Credential
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/verify"
                  onClick={collapseMobileMenu}
                  className={({ isActive }) =>
                    `certum-nav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  Verify Record
                </NavLink>
              </li>
            </ul>

            <div className="d-flex flex-wrap align-items-center gap-2 pb-2 pb-lg-0">
              <button
                type="button"
                className="certum-chip certum-network-btn"
                onClick={() => void checkDevnet(true)}
                disabled={isPinging}
                title={
                  devnetSlot !== null
                    ? `Solana Devnet RPC online · Slot #${devnetSlot.toLocaleString()} (click to refresh)`
                    : "Check Solana Devnet RPC status"
                }
              >
                <span
                  className={`certum-sonar${devnetOnline ? "" : " is-offline"}`}
                  aria-hidden="true"
                />
                <span>Solana Devnet</span>
              </button>

              <div className="d-none d-lg-block">
                <ThemeToggle />
              </div>

              {isConnected && shortAddress ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="certum-chip certum-chip-amber certum-mono">
                    {shortAddress}
                  </span>
                  <button
                    type="button"
                    className="certum-btn certum-btn-ghost"
                    style={{ minHeight: "44px", padding: "0 1rem" }}
                    onClick={onDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="btn-group">
                  {isWalletReady && wallets.length === 0 ? (
                    <a
                      className="certum-btn certum-btn-ghost"
                      style={{ minHeight: "44px" }}
                      href="https://phantom.app/download"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-wallet2" aria-hidden="true" />
                      Install Phantom
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="certum-btn certum-btn-primary"
                      style={{ minHeight: "44px" }}
                      disabled={!isWalletReady || isConnecting}
                      onClick={onConnectPreferred}
                    >
                      <i className="bi bi-wallet2" aria-hidden="true" />
                      {isConnecting
                        ? "Connecting..."
                        : isWalletReady
                          ? "Connect Phantom"
                          : "Checking Wallets..."}
                    </button>
                  )}
                  {wallets.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="certum-btn certum-btn-primary dropdown-toggle dropdown-toggle-split"
                        style={{ minHeight: "44px", padding: "0 0.75rem" }}
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        aria-label="Choose another Solana wallet"
                      />
                      <ul className="dropdown-menu dropdown-menu-end">
                        {wallets.map((wallet) => (
                          <li key={wallet.name}>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => onConnectWallet(wallet)}
                            >
                              {wallet.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
