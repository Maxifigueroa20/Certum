import { Navigate, Route, Routes, useNavigate } from "react-router";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { Toaster } from "sonner";
import { AppFooter } from "./components/AppFooter";
import { AppNavbar } from "./components/AppNavbar";
import { useWalletConnection } from "./hooks/useWalletConnection";
import { extractAddressFromLookup } from "./hooks/useVerification";
import { IssuePage } from "./pages/IssuePage";
import { LandingPage } from "./pages/LandingPage";
import { VerifyPage } from "./pages/VerifyPage";

export function App() {
  const navigate = useNavigate();
  const wallet = useWalletConnection();

  function navigateToVerify(addressOrUrl: string) {
    const cleanAddress = extractAddressFromLookup(addressOrUrl);
    if (cleanAddress) {
      navigate(`/verify/${encodeURIComponent(cleanAddress)}`);
    } else {
      navigate("/verify");
    }
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="d-flex flex-column min-vh-100">
      <AppNavbar
        shortAddress={wallet.shortAddress}
        isConnected={Boolean(wallet.connected)}
        isConnecting={wallet.isConnecting}
        isWalletReady={wallet.isReady}
        wallets={wallet.wallets}
        onConnectPreferred={wallet.connectPreferred}
        onConnectWallet={wallet.connect}
        onDisconnect={wallet.disconnect}
      />

      <main className="flex-grow-1">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onNavigate={(path) => navigate(path)}
                onQuickVerify={navigateToVerify}
              />
            }
          />
          <Route
            path="/issue"
            element={
              <IssuePage
                walletAddress={wallet.walletAddress}
                transactionVersion={wallet.transactionVersion}
                isConnected={Boolean(wallet.connected)}
                isConnecting={wallet.isConnecting}
                isWalletReady={wallet.isReady}
                wallets={wallet.wallets}
                onConnectPreferred={wallet.connectPreferred}
                onInspectAttestation={navigateToVerify}
              />
            }
          />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:attestationAddress" element={<VerifyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AppFooter />
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{ className: "certum-toast" }}
      />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

export default App;
