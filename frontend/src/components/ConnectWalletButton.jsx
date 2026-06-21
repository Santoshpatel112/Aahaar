import  { useState, useRef, useEffect } from "react";
import useWallet from "../hooks/useWallet";

/**
 * Polished, glassmorphic Connect Wallet button.
 * Renders connection triggers, network statuses, shortened addresses, and mismatch warnings.
 */
export default function ConnectWalletButton() {
  const {
    walletAddress,
    isConnected,
    loading,
    networkName,
    isCorrectNetwork,
    networkError,
    connectWallet,
    disconnectWallet,
    switchNetwork
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shortenAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (loading) {
    return (
      <button className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px" }} disabled>
        <span className="spinner" /> Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button 
        className="btn-primary" 
        style={{ 
          background: "var(--grad-purple)", 
          border: "none", 
          padding: "8px 18px", 
          fontSize: "0.85rem",
          display: "inline-flex",
          alignItems: "center",
          gap: 6
        }}
        onClick={connectWallet}
      >
        🦊 Connect Wallet
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }} ref={dropdownRef}>
      {/* Network Warning Banner */}
      {!isCorrectNetwork && (
        <button 
          className="btn-danger" 
          style={{ 
            fontSize: "0.75rem", 
            padding: "5px 12px", 
            background: "rgba(239, 68, 68, 0.15)", 
            color: "#f87171", 
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}
          onClick={() => switchNetwork("hardhat")}
          title={networkError}
        >
          ⚠️ Switch to Localhost
        </button>
      )}

      {/* Main Connection Status Selector */}
      <button
        className="btn-ghost"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background: "rgba(255, 255, 255, 0.03)",
          borderColor: isCorrectNetwork ? "var(--border-color)" : "rgba(239, 68, 68, 0.3)",
          fontSize: "0.82rem",
          fontWeight: 600
        }}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        {/* Connection Dot */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isCorrectNetwork ? "#4ade80" : "var(--color-red)",
          display: "inline-block",
          boxShadow: isCorrectNetwork ? "0 0 8px #4ade80" : "0 0 8px var(--color-red)"
        }} />
        
        <span style={{ fontFamily: "monospace" }}>
          {shortenAddress(walletAddress)}
        </span>

        {isCorrectNetwork && (
          <span style={{ fontSize: "0.75rem", opacity: 0.6, fontWeight: 500 }}>
            ({networkName})
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Actions */}
      {dropdownOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          padding: 8,
          minWidth: 180,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          animation: "fadeInUp 0.15s ease-out"
        }}>
          <div style={{ padding: "6px 10px", fontSize: "0.72rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", marginBottom: 4 }}>
            Active Account
          </div>
          <button
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "background var(--transition-fast)"
            }}
            onClick={() => {
              navigator.clipboard.writeText(walletAddress);
              setDropdownOpen(false);
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            📋 Copy Address
          </button>
          
          {!isCorrectNetwork && (
            <button
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                background: "transparent",
                color: "var(--color-yellow)",
                fontSize: "0.8rem",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "background var(--transition-fast)"
              }}
              onClick={() => {
                switchNetwork("hardhat");
                setDropdownOpen(false);
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              🔄 Switch to Localhost
            </button>
          )}

          <button
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              background: "transparent",
              color: "var(--color-red)",
              fontSize: "0.8rem",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "background var(--transition-fast)"
            }}
            onClick={() => {
              disconnectWallet();
              setDropdownOpen(false);
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            🔌 Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
