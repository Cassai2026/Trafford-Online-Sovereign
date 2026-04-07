//! # Kong Node — Primal Alpha / Heavy-Compute & Energy Harvesting
//!
//! Responsibilities:
//!   - Kinetic energy harvesting ingestion pipeline
//!   - Raw biological power input normalization (sensor ADC values → watts)
//!   - Heavy-lift intensive compute queue dispatch
//!
//! Timing contract: compute dispatch latency target < 500 µs.

use tokio::time::{interval, Duration};
use tracing::{debug, info, warn};

const COMPUTE_TICK_MS:       u64 = 50;
const LOW_ENERGY_THRESHOLD:  f64 = 10.0;  // watts — warn below this level
const MAX_QUEUE_DEPTH:        usize = 256;

/// A heavyweight compute request queued for dispatch.
#[derive(Debug)]
pub struct ComputeTask {
    pub id:          u64,
    pub load_watts:  f64,
    pub description: String,
}

struct KongState {
    task_counter:    u64,
    queue:           Vec<ComputeTask>,
    harvested_watts: f64,
}

impl KongState {
    fn new() -> Self {
        Self {
            task_counter:    0,
            queue:           Vec::with_capacity(MAX_QUEUE_DEPTH),
            harvested_watts: 0.0,
        }
    }

    /// Ingest a power reading from the harvesting subsystem (ADC → watts).
    fn ingest_power(&mut self, raw_adc: u16) {
        // Conversion factor: calibrate per hardware — placeholder linear scale
        const VOLTS_PER_BIT: f64 = 3.3 / 4096.0;
        const LOAD_OHMS:     f64 = 0.1;
        let voltage = raw_adc as f64 * VOLTS_PER_BIT;
        let watts   = (voltage * voltage) / LOAD_OHMS;

        self.harvested_watts = watts;

        if watts < LOW_ENERGY_THRESHOLD {
            warn!("[Kong] Low energy input: {:.2} W — kinetic harvest insufficient", watts);
        } else {
            debug!("[Kong] Energy harvested: {:.2} W", watts);
        }
    }

    /// Queue a compute task; drop oldest if queue is full (back-pressure).
    fn enqueue_task(&mut self, description: &str, load_watts: f64) {
        if self.queue.len() >= MAX_QUEUE_DEPTH {
            let dropped = self.queue.remove(0);
            warn!("[Kong] Queue full — dropped task #{}", dropped.id);
        }
        self.task_counter += 1;
        self.queue.push(ComputeTask {
            id:          self.task_counter,
            load_watts,
            description: description.into(),
        });
        debug!("[Kong] Task #{} enqueued ({:.2} W demand)", self.task_counter, load_watts);
    }

    /// Dispatch the next task from the queue if energy allows.
    fn dispatch_next(&mut self) {
        if let Some(task) = self.queue.first() {
            if task.load_watts <= self.harvested_watts {
                let dispatched = self.queue.remove(0);
                debug!(
                    "[Kong] Dispatching task #{}: {} ({:.2} W)",
                    dispatched.id, dispatched.description, dispatched.load_watts
                );
            }
        }
    }

    fn tick(&mut self) {
        // Synthetic heartbeat: simulate ADC reading ≈ 2 048 (mid-scale = ~1 V → 10 W)
        self.ingest_power(2048);
        self.enqueue_task("mesh-heartbeat-compute", 5.0);
        self.dispatch_next();
    }
}

/// Entry point — spawned as a tokio task by the edge controller.
pub async fn run() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("[Kong] Node online — Heavy-Compute / Energy Harvesting");
    let mut state = KongState::new();
    let mut ticker = interval(Duration::from_millis(COMPUTE_TICK_MS));

    loop {
        ticker.tick().await;
        state.tick();
    }
}
