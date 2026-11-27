# Sample Footage Directory

Place legitimate UAV RGB-Thermal sample video pairs here to enable the **Load Sample Footage** button on the UAV SAR Dashboard:

- `rgb.mp4` (required) — RGB drone footage (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`)
- `thermal.mp4` (optional) — synchronized thermal footage. If omitted, the backend automatically generates pseudo-thermal frames using `cv2.COLORMAP_HOT`, matching `hiungn/RGBT-Fusion-Drone-SAR`.

> Note: The original `https://github.com/hiungn/RGBT-Fusion-Drone-SAR` repository does not bundle sample `.mp4` or `.avi` videos publicly.
