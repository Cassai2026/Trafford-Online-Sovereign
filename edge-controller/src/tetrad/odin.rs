//! # Odin Node — Structure, Strategy & Ledger Mathematics
//!
//! Responsibilities:
//!   - 4D geometric asset mapping (long-range infrastructure layout)
//!   - Sovereign ledger: energy-credit and carbon-credit accounting
//!   - Long-range asset protection (integrity-hash verification)
//!
//! Timing contract: ledger ticks every 1 000 ms (non-critical path).

use crate::hub::HubClient;
use serde::{Deserialize, Serialize};
use tokio::time::{interval, Duration};
use tracing::{debug, info};

/// A single ledger entry tracking energy and carbon credits for a mesh node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    pub node_id:        String,
    pub energy_credits: f64,
    pub carbon_credits: f64,
    pub sequence:       u64,
}

/// Simple in-memory ledger state (replace with persistent store in production).
struct OdinState {
    entries:  Vec<LedgerEntry>,
    sequence: u64,
}

impl OdinState {
    fn new() -> Self {
        Self { entries: Vec::new(), sequence: 0 }
    }

    /// Record a synthetic heartbeat entry to prove the ledger is alive.
    fn tick(&mut self) {
        self.sequence += 1;
        let entry = LedgerEntry {
            node_id:        "odin-heartbeat".into(),
            energy_credits: 0.0,
            carbon_credits: 0.0,
            sequence:       self.sequence,
        };
        // Cap in-memory history at 1 000 entries for edge hardware memory bounds
        if self.entries.len() >= 1_000 {
            self.entries.remove(0);
        }
        self.entries.push(entry);
        debug!("[Odin] Ledger tick #{}", self.sequence);
    }
}

/// Entry point — spawned as a tokio task by the edge controller.
pub async fn run(hub: Option<HubClient>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("[Odin] Node online — Structure / Ledger Mathematics");
    let mut state   = OdinState::new();
    let mut ticker  = interval(Duration::from_millis(1_000));

    // ACK Hub every 60 s (every 60 ledger ticks)
    const ACK_EVERY: u64 = 60;

    loop {
        ticker.tick().await;
        state.tick();

        if state.sequence % ACK_EVERY == 0 {
            if let Some(ref h) = hub {
                h.ack("odin", "HEARTBEAT", &format!("ledger sequence #{}", state.sequence)).await;
            }
        }
    }
}
