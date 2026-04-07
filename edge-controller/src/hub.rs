//! # Hub Client — ACK bridge to the Trafford Sovereign Hub API
//!
//! Each Tetrad node calls [`HubClient::ack`] after completing a work cycle.
//! The call is fire-and-forget: errors are logged but never crash the node.
//! This keeps the RT control path completely isolated from network latency.
//!
//! Configuration (environment variables):
//!   HUB_URL       — base URL of the Hub API (e.g. `http://localhost:4000/api`)
//!   HUB_ACK_TOKEN — Bearer token accepted by POST /vajra/ack

use reqwest::Client;
use serde::Serialize;
use tracing::{debug, warn};

/// Payload sent to `POST /vajra/ack`.
#[derive(Debug, Serialize)]
struct AckPayload<'a> {
    node:    &'a str,
    status:  &'a str,
    message: &'a str,
}

/// Shared HTTP client for sending ACK events to the Hub.
///
/// Clone freely — [`reqwest::Client`] uses an internal `Arc` and is cheap to clone.
#[derive(Clone)]
pub struct HubClient {
    client:    Client,
    ack_url:   String,
    token:     String,
}

impl HubClient {
    /// Build a [`HubClient`] from the `HUB_URL` and `HUB_ACK_TOKEN` environment variables.
    /// Returns `None` when `HUB_URL` is not set (ACK calls are skipped).
    pub fn from_env() -> Option<Self> {
        let hub_url  = std::env::var("HUB_URL").ok()?;
        let token    = std::env::var("HUB_ACK_TOKEN").unwrap_or_default();
        let ack_url  = format!("{}/vajra/ack", hub_url.trim_end_matches('/'));
        Some(Self { client: Client::new(), ack_url, token })
    }

    /// POST an ACK event to the Hub.  Non-blocking — awaited but errors are only logged.
    ///
    /// # Arguments
    /// * `node`    — Tetrad node name (`odin` / `hekete` / `kong` / `enki`)
    /// * `status`  — Human-readable status string (e.g. `HEARTBEAT`, `QUEUED`)
    /// * `message` — Optional detail message
    pub async fn ack(&self, node: &str, status: &str, message: &str) {
        let payload = AckPayload { node, status, message };
        let result  = self
            .client
            .post(&self.ack_url)
            .bearer_auth(&self.token)
            .json(&payload)
            .send()
            .await;

        match result {
            Ok(resp) if resp.status().is_success() => {
                debug!("[Hub] ACK sent — node={} status={}", node, status);
            }
            Ok(resp) => {
                warn!("[Hub] ACK rejected — node={} status={} http={}", node, status, resp.status());
            }
            Err(err) => {
                warn!("[Hub] ACK failed — node={} err={}", node, err);
            }
        }
    }
}
