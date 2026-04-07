//! # Hekete Node — Firewall / Crossroads Data-Flow
//!
//! Responsibilities:
//!   - Inspect every incoming mesh packet at the "crossroads"
//!   - Block unauthorised extraction attempts
//!   - Route encrypted mesh traffic to the correct destination node
//!   - Cryogenic Purge: hard-lock on repeated unauthorised ping detection
//!
//! Timing contract: security scan target < 10 µs per packet.

use std::collections::HashMap;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

const MAX_UNAUTH_STRIKES: u32 = 5;
const SCAN_INTERVAL_MS:   u64 = 100;

/// Classification of an incoming mesh packet.
#[derive(Debug, PartialEq)]
pub enum PacketVerdict {
    Allowed,
    Blocked,
    CryogenicPurge,
}

/// Simple rule-based access control; extend with cryptographic passkey verification.
pub fn inspect_packet(source_id: &str, is_authorised: bool, strike_count: u32) -> PacketVerdict {
    if is_authorised {
        return PacketVerdict::Allowed;
    }
    if strike_count >= MAX_UNAUTH_STRIKES {
        return PacketVerdict::CryogenicPurge;
    }
    PacketVerdict::Blocked
}

struct HeketeState {
    /// Maps source_id → consecutive unauthorised attempt count
    strike_register: HashMap<String, u32>,
    purge_triggered: bool,
}

impl HeketeState {
    fn new() -> Self {
        Self {
            strike_register: HashMap::new(),
            purge_triggered: false,
        }
    }

    /// Simulate receiving a packet (replace with real socket/IPC receive in production).
    fn process_synthetic_tick(&mut self) {
        // Synthetic demo: all heartbeat packets are authorised
        let source = "mesh-heartbeat";
        let authorised = true;
        let strikes = *self.strike_register.get(source).unwrap_or(&0);

        match inspect_packet(source, authorised, strikes) {
            PacketVerdict::Allowed => {}
            PacketVerdict::Blocked => {
                let count = self.strike_register.entry(source.into()).or_insert(0);
                *count += 1;
                warn!("[Hekete] Blocked packet from '{}' (strike {})", source, count);
            }
            PacketVerdict::CryogenicPurge => {
                if !self.purge_triggered {
                    self.purge_triggered = true;
                    error!(
                        "[Hekete] ⚠️  CRYOGENIC PURGE triggered — \
                         {} unauthorised hits from '{}'",
                        strikes, source
                    );
                    // In production: write purge flag to shared memory / GPIO
                }
            }
        }
    }
}

/// Entry point — spawned as a tokio task by the edge controller.
pub async fn run() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("[Hekete] Node online — Firewall / Crossroads");
    let mut state = HeketeState::new();
    let mut ticker = interval(Duration::from_millis(SCAN_INTERVAL_MS));

    loop {
        ticker.tick().await;
        state.process_synthetic_tick();
    }
}

// ─── Unit tests ───────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authorised_packet_is_allowed() {
        assert_eq!(inspect_packet("valid-node", true, 0), PacketVerdict::Allowed);
    }

    #[test]
    fn unauthorised_packet_is_blocked() {
        assert_eq!(inspect_packet("bad-actor", false, 0), PacketVerdict::Blocked);
    }

    #[test]
    fn cryogenic_purge_triggers_at_threshold() {
        assert_eq!(
            inspect_packet("bad-actor", false, MAX_UNAUTH_STRIKES),
            PacketVerdict::CryogenicPurge
        );
    }

    #[test]
    fn purge_does_not_trigger_below_threshold() {
        assert_eq!(
            inspect_packet("bad-actor", false, MAX_UNAUTH_STRIKES - 1),
            PacketVerdict::Blocked
        );
    }
}
