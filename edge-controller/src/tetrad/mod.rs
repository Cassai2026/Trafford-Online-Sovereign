//! Tetrad Algorithm — four archetype processing nodes.
//!
//! Each node is a self-contained async task pinned to the edge controller.
//! They communicate via tokio channels (mpsc) rather than shared mutable state.

pub mod enki;
pub mod hekete;
pub mod kong;
pub mod odin;
