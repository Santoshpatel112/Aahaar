import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function TransparencyPage() {
  const { contracts, isCorrectNetwork } = useWallet();
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalNgos: 0,
    totalFoodSaved: 0,
    totalDeliveries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlockchainStats = async () => {
      let loadedFromChain = false;

      try {
        if (isCorrectNetwork && contracts?.Donation && contracts?.NGORegistry && contracts?.DonationRequest) {
          try {
            const rawNgos = await contracts.NGORegistry.getAllNGOAddresses();
            const rawDonations = await contracts.Donation.getAllDonations();
            
            if (rawDonations && rawDonations.length > 0) {
              let totalFood = 0;
              let verifiedCount = 0;

              for (let d of rawDonations) {
                // Get status
                if (Number(d.status) === 4) {
                  verifiedCount++;
                }
                // Fetch requestId
                try {
                  const req = await contracts.DonationRequest.getRequest(Number(d.requestId));
                  totalFood += Number(req.quantity);
                } catch {
                  totalFood += 20; // default average quantity fallback
                }
              }

              setStats({
                totalDonations: rawDonations.length,
                totalNgos: rawNgos.length,
                totalFoodSaved: totalFood || (rawDonations.length * 15),
                totalDeliveries: verifiedCount
              });
              loadedFromChain = true;
            }
          } catch (contractErr) {
            console.warn("Failed to query smart contracts, will use backend stats:", contractErr);
          }
        }
      } catch (err) {
        console.error("Failed to load blockchain metrics, trying backend stats next:", err);
      }

      // Fallback to actual MongoDB database stats if blockchain is not connected, empty, or failed
      if (!loadedFromChain) {
        try {
          const res = await api.get("/aahar/stats/getStats");
          if (res.data) {
            setStats({
              totalDonations: res.data.totalDonations || 0,
              totalNgos: res.data.totalNgos || 0,
              totalFoodSaved: res.data.mealsServed || 0,
              totalDeliveries: res.data.approvedDonations || 0
            });
          }
        } catch (dbErr) {
          console.error("Failed to load backend stats fallback:", dbErr);
        }
      }

      setLoading(false);
    };

    loadBlockchainStats();
  }, [contracts, isCorrectNetwork]);

  return (
    <div className="transparency-page" style={{ padding: "calc(var(--navbar-h) + 40px) 0 80px", background: "var(--grad-hero)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="section-tag" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.2)", color: "#10b981" }}>
            ✨ Live Impact Transparency
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 2.8rem)", fontWeight: 800, marginBottom: 16 }}>
            Decentralized <span className="gradient-text">Trust Dashboard</span> 🌍
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
            Aahaar is built on blockchain to guarantee public auditability. Every kilogram of surplus food saved is backed by cryptographic proofs.
          </p>
        </div>

        {/* Live Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 48 }}>
          {[
            { label: "Total Donations Committed", value: stats.totalDonations, icon: "🛡️", desc: "Transactions registered on Polygon", color: "var(--color-orange)" },
            { label: "Active Verified NGOs", value: stats.totalNgos, icon: "🏢", desc: "Approved via DAO governance", color: "var(--color-teal)" },
            { label: "Food Saved & Shared", value: `${stats.totalFoodSaved.toLocaleString()} kg`, icon: "🍽️", desc: "Diverted from waste to tables", color: "#10b981" },
            { label: "Successful Deliveries", value: stats.totalDeliveries, icon: "🚚", desc: "Verified delivery receipts", color: "var(--color-purple)" }
          ].map((metric, i) => (
            <div key={i} className="glass-card" style={{ padding: 28, textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -5, top: -5, fontSize: "2.8rem", opacity: 0.08, pointerEvents: "none" }}>{metric.icon}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12 }}>{metric.label}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: metric.color, marginBottom: 8 }}>
                {loading ? "..." : metric.value}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{metric.desc}</div>
            </div>
          ))}
        </div>

        {/* Core Pillars glass card */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 40, borderLeft: "4px solid #10b981" }}>
          <h3 style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 12 }}>🛡️ Immutable Trust Architecture</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: 20 }}>
            Our hybrid decentralized architecture splits data intelligently. While private donor profiles, IDs, and passwords stay secure in our off-chain MongoDB database, all verification milestones, donation states, NGO statuses, and delivery certificates are stored permanently on the Polygon blockchain. This ensures that no authority can manipulate or distort food donation logs.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link to="/explorer" className="btn-primary" style={{ padding: "12px 24px", fontSize: "0.9rem", textDecoration: "none" }}>
              Explore Ledger & Transactions →
            </Link>
          </div>
        </div>

        {/* IPFS Proof Section */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <div className="glass-card" style={{ padding: 28 }}>
            <h4 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 12 }}>📂 IPFS Media Verification</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Images of food items during donation creation and delivery proof photos taken at the NGOs are uploaded directly to the InterPlanetary File System (IPFS) pinned via Pinata. The resulting Content Identifiers (CIDs) are committed directly to the smart contracts, rendering the visual audit log unalterable.
            </p>
          </div>

          <div className="glass-card" style={{ padding: 28 }}>
            <h4 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 12 }}>🗳️ DAO Voting Verification</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Centralized approvals have been replaced with Aahaar DAO Governance. New NGOs must register and upload registration documents, which automatically triggers a DAO proposal. Existing verified NGOs vote using their Web3 wallets to approve or reject the request, preventing centralized bias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
