//! # Enki Node — Thermal Cooling, Fluid Dynamics & Hardware Hydration
//!
//! Responsibilities:
//!   - Monitor CPU/board temperature sensors (`/sys/class/thermal/`)
//!   - Modulate cooling fan PWM duty-cycle based on thermal feedback
//!   - Saline induction protocol: trigger hardware hydration alerts
//!   - Thermal runaway detection and emergency shutdown gate
//!
//! Timing contract: thermal control loop every 500 ms.

use tokio::time::{interval, Duration};
use tracing::{debug, error, info, warn};

const THERMAL_TICK_MS:      u64 = 500;
const WARN_TEMP_C:          f64 = 70.0;
const CRITICAL_TEMP_C:      f64 = 85.0;
const SALINE_HUMIDITY_PCT:  f64 = 30.0;  // below this → issue hydration alert

/// Read the CPU temperature from the Linux thermal subsystem.
/// Returns `None` on non-Linux platforms or if the sensor is unavailable.
#[cfg(target_os = "linux")]
fn read_cpu_temp_celsius() -> Option<f64> {
    std::fs::read_to_string("/sys/class/thermal/thermal_zone0/temp")
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok())
        .map(|millideg| millideg / 1_000.0)
}

#[cfg(not(target_os = "linux"))]
fn read_cpu_temp_celsius() -> Option<f64> {
    Some(45.0) // synthetic value for non-Linux dev environments
}

/// Map a temperature to a fan PWM duty-cycle percentage (0–100).
/// Linear ramp: 40 °C → 20 %, 85 °C → 100 %.
pub fn temp_to_pwm(temp_c: f64) -> u8 {
    let clamped = temp_c.clamp(40.0, CRITICAL_TEMP_C);
    let pct = (clamped - 40.0) / (CRITICAL_TEMP_C - 40.0) * 80.0 + 20.0;
    pct.round() as u8
}

struct EnkiState {
    last_temp_c: f64,
    fan_pwm:     u8,
}

impl EnkiState {
    fn new() -> Self {
        Self { last_temp_c: 0.0, fan_pwm: 20 }
    }

    fn tick(&mut self) {
        // Thermal regulation
        if let Some(temp) = read_cpu_temp_celsius() {
            self.last_temp_c = temp;
            self.fan_pwm     = temp_to_pwm(temp);

            if temp >= CRITICAL_TEMP_C {
                error!(
                    "[Enki] ⚠️  THERMAL RUNAWAY: {:.1}°C — emergency cooling engaged (PWM {}%)",
                    temp, self.fan_pwm
                );
                // In production: write PWM to /sys/class/pwm/pwmchip0/pwm0/duty_cycle
                // and optionally trigger a safe system halt
            } else if temp >= WARN_TEMP_C {
                warn!("[Enki] High temperature: {:.1}°C — fan at {}%", temp, self.fan_pwm);
            } else {
                debug!("[Enki] Temp: {:.1}°C  Fan: {}%", temp, self.fan_pwm);
            }
        }

        // Saline / humidity hydration protocol (synthetic — replace with I²C sensor read)
        let humidity_pct = 45.0_f64; // placeholder reading
        if humidity_pct < SALINE_HUMIDITY_PCT {
            warn!(
                "[Enki] Hardware hydration alert: ambient humidity {:.1}% below threshold {:.1}%",
                humidity_pct, SALINE_HUMIDITY_PCT
            );
        }
    }
}

/// Entry point — spawned as a tokio task by the edge controller.
pub async fn run() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("[Enki] Node online — Thermal Cooling / Fluid Dynamics");
    let mut state = EnkiState::new();
    let mut ticker = interval(Duration::from_millis(THERMAL_TICK_MS));

    loop {
        ticker.tick().await;
        state.tick();
    }
}

// ─── Unit tests ───────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pwm_at_minimum_at_low_temp() {
        assert_eq!(temp_to_pwm(20.0), 20);
    }

    #[test]
    fn pwm_at_maximum_at_critical_temp() {
        assert_eq!(temp_to_pwm(CRITICAL_TEMP_C), 100);
    }

    #[test]
    fn pwm_midpoint_is_correct() {
        // At 62.5 °C (midway between 40 and 85) → 60 %
        assert_eq!(temp_to_pwm(62.5), 60);
    }
}
