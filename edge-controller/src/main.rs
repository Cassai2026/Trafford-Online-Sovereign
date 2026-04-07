//! # Genesis Edge Controller — Layer 1: Molecular Edge Controller
//!
//! RT Preempt Linux target.  Intended to run on a PREEMPT_RT patched kernel with:
//!   - SCHED_FIFO scheduling (priority 80)
//!   - CPU affinity pinned to an isolated core (isolcpus= kernel param)
//!   - mlockall() to prevent page-faults during execution
//!
//! Deterministic response target: < 10 µs end-to-end command latency.

mod hub;
mod tetrad;

use hub::HubClient;
use tetrad::{enki, hekete, kong, odin};
use tracing::{error, info, warn};

// ─── RT Linux setup ──────────────────────────────────────────────────────────

/// Lock all current and future memory pages into RAM to prevent page-fault jitter.
/// Must be called before any heap allocation on an RT system.
#[cfg(target_os = "linux")]
fn lock_memory() {
    use std::os::raw::c_int;

    extern "C" {
        fn mlockall(flags: c_int) -> c_int;
    }

    const MCL_CURRENT: c_int = 1;
    const MCL_FUTURE: c_int = 2;

    let ret = unsafe { mlockall(MCL_CURRENT | MCL_FUTURE) };
    if ret != 0 {
        warn!("[RT] mlockall failed — page-fault jitter possible (errno {})", ret);
    } else {
        info!("[RT] Memory locked (MCL_CURRENT | MCL_FUTURE)");
    }
}

#[cfg(not(target_os = "linux"))]
fn lock_memory() {
    warn!("[RT] mlockall not available on this platform — skipping");
}

/// Set the calling thread to SCHED_FIFO with the given RT priority.
/// Requires CAP_SYS_NICE or running as root on the edge node.
#[cfg(target_os = "linux")]
fn set_realtime_priority(priority: i32) {
    use std::os::raw::{c_int, c_long};

    #[repr(C)]
    struct SchedParam {
        sched_priority: c_int,
    }

    extern "C" {
        fn sched_setscheduler(pid: c_long, policy: c_int, param: *const SchedParam) -> c_int;
    }

    const SCHED_FIFO: c_int = 1;
    let param = SchedParam { sched_priority: priority };
    let ret = unsafe { sched_setscheduler(0, SCHED_FIFO, &param as *const _) };
    if ret != 0 {
        warn!("[RT] sched_setscheduler failed — running without RT priority");
    } else {
        info!("[RT] SCHED_FIFO priority {} applied", priority);
    }
}

#[cfg(not(target_os = "linux"))]
fn set_realtime_priority(_priority: i32) {
    warn!("[RT] Real-time scheduling not available on this platform — skipping");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main(flavor = "current_thread")]  // single-thread: deterministic, no lock contention
async fn main() {
    // Initialise structured logging (RUST_LOG env or default to info)
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    info!("╔══════════════════════════════════════════════════════╗");
    info!("║  Genesis Edge Controller — Layer 1 (Molecular)       ║");
    info!("║  Sovereign Mesh · Trafford Online                    ║");
    info!("╚══════════════════════════════════════════════════════╝");

    // Apply RT hardening before anything else
    lock_memory();
    set_realtime_priority(80);

    // Boot the four Tetrad archetype nodes
    info!("[Boot] Initialising Tetrad Algorithm nodes…");

    // Initialise Hub client from environment (optional — skipped if HUB_URL is unset)
    let hub = HubClient::from_env();
    if hub.is_some() {
        info!("[Hub] ACK client initialised — sovereign ACKs will be broadcast to Hub SSE stream");
    } else {
        info!("[Hub] HUB_URL not set — running without Hub ACK reporting");
    }

    let odin_handle   = tokio::spawn(odin::run(hub.clone()));
    let hekete_handle = tokio::spawn(hekete::run(hub.clone()));
    let kong_handle   = tokio::spawn(kong::run(hub.clone()));
    let enki_handle   = tokio::spawn(enki::run(hub));

    // Await all nodes — any panic in a node is surfaced here
    let results = tokio::join!(odin_handle, hekete_handle, kong_handle, enki_handle);

    for (name, result) in [("Odin", results.0), ("Hekete", results.1), ("Kong", results.2), ("Enki", results.3)] {
        match result {
            Ok(Ok(())) => info!("[Shutdown] {} node exited cleanly", name),
            Ok(Err(e)) => error!("[ERROR] {} node: {}", name, e),
            Err(e)     => error!("[PANIC] {} node panicked: {}", name, e),
        }
    }

    info!("[Halt] Genesis Edge Controller shutdown complete.");
}
