import os
import subprocess

ICONS = {
    16: {
        "rx": 2.5,
        "svg": """<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <rect width="16" height="16" rx="2.5" fill="url(#bg)"/>
  
  <!-- Left Page -->
  <path d="M7 13.5 C4.5 12.2 2.8 12.2 2 12.8 V5.2 C2.8 4.7 4.5 4.7 7 5.8 V13.5 Z" fill="#FFFFFF"/>
  <!-- Right Page -->
  <path d="M9 13.5 C11.5 12.2 13.2 12.2 14 12.8 V5.2 C13.2 4.7 11.5 4.7 9 5.8 V13.5 Z" fill="#FFFFFF"/>
  <!-- Spine -->
  <rect x="7" y="5.5" width="2" height="8" rx="0.5" fill="#CCFBF1"/>
  <line x1="8" y1="6" x2="8" y2="13" stroke="#0D9488" stroke-width="0.75"/>
  
  <!-- Lines on pages -->
  <line x1="3.2" y1="7.2" x2="6" y2="8" stroke="#0F766E" stroke-width="0.75" stroke-linecap="round"/>
  <line x1="3.2" y1="9.5" x2="6" y2="10.3" stroke="#0F766E" stroke-width="0.75" stroke-linecap="round"/>
  <line x1="10" y1="8" x2="12.8" y2="7.2" stroke="#0F766E" stroke-width="0.75" stroke-linecap="round"/>
  <line x1="10" y1="10.3" x2="12.8" y2="9.5" stroke="#0F766E" stroke-width="0.75" stroke-linecap="round"/>
  
  <!-- AI Spark -->
  <path d="M8 0.8 C8 2.1 8.6 2.6 10.5 3 C8.6 3.4 8 3.9 8 5.2 C8 3.9 7.4 3.4 5.5 3 C7.4 2.6 8 2.1 8 0.8 Z" fill="#FEF08A"/>
  <circle cx="8" cy="3" r="0.6" fill="#FFFFFF"/>
</svg>"""
    },
    32: {
        "rx": 4.5,
        "svg": """<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="4.5" fill="url(#bg)"/>
  
  <!-- Left Page -->
  <path d="M14 26.5 C9 24.5 5.5 24.5 4 25.5 V10.5 C5.5 9.5 9 9.5 14 11.5 V26.5 Z" fill="#FFFFFF"/>
  <!-- Right Page -->
  <path d="M18 26.5 C23 24.5 26.5 24.5 28 25.5 V10.5 C26.5 9.5 23 9.5 18 11.5 V26.5 Z" fill="#FFFFFF"/>
  <!-- Spine -->
  <rect x="14" y="11" width="4" height="15.5" rx="1" fill="#CCFBF1"/>
  <line x1="16" y1="11.5" x2="16" y2="26" stroke="#0D9488" stroke-width="1.2"/>
  
  <!-- Lines on pages -->
  <line x1="6.5" y1="14" x2="12" y2="15.5" stroke="#0F766E" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="6.5" y1="18" x2="12" y2="19.5" stroke="#0F766E" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="6.5" y1="22" x2="12" y2="23.5" stroke="#0F766E" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="20" y1="15.5" x2="25.5" y2="14" stroke="#0F766E" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="20" y1="19.5" x2="25.5" y2="18" stroke="#0F766E" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="20" y1="23.5" x2="25.5" y2="22" stroke="#0F766E" stroke-width="1.2" stroke-linecap="round"/>
  
  <!-- AI Spark -->
  <path d="M16 1.5 C16 4.2 17.2 5.2 21 6 C17.2 6.8 16 7.8 16 10.5 C16 7.8 14.8 6.8 11 6 C14.8 5.2 16 4.2 16 1.5 Z" fill="#FEF08A"/>
  <circle cx="16" cy="6" r="1.2" fill="#FFFFFF"/>
</svg>"""
    },
    48: {
        "rx": 7.0,
        "svg": """<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="7" fill="url(#bg)"/>
  
  <!-- Left Page -->
  <path d="M21 40 C13.5 37 8 37 6 38.5 V15.5 C8 14 13.5 14 21 17 V40 Z" fill="#FFFFFF"/>
  <!-- Right Page -->
  <path d="M27 40 C34.5 37 40 37 42 38.5 V15.5 C40 14 34.5 14 27 17 V40 Z" fill="#FFFFFF"/>
  <!-- Spine -->
  <rect x="21" y="16.5" width="6" height="23.5" rx="1.5" fill="#CCFBF1"/>
  <line x1="24" y1="17" x2="24" y2="39.5" stroke="#0D9488" stroke-width="1.8"/>
  
  <!-- Lines on pages -->
  <line x1="9.5" y1="21" x2="18" y2="23" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="9.5" y1="27" x2="18" y2="29" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="9.5" y1="33" x2="18" y2="35" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="30" y1="23" x2="38.5" y2="21" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="30" y1="29" x2="38.5" y2="27" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="30" y1="35" x2="38.5" y2="33" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/>
  
  <!-- AI Spark -->
  <path d="M24 2 C24 6 25.8 7.5 31.5 8.5 C25.8 9.5 24 11 24 15 C24 11 22.2 9.5 16.5 8.5 C22.2 7.5 24 6 24 2 Z" fill="#FEF08A"/>
  <circle cx="24" cy="8.5" r="1.8" fill="#FFFFFF"/>
</svg>"""
    },
    128: {
        "rx": 18.0,
        "svg": """<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#0F766E"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="18" fill="url(#bg)"/>
  
  <!-- Left Page -->
  <path d="M56 108 C36 100 21 100 16 104 V41 C21 37 36 37 56 45 V108 Z" fill="#FFFFFF"/>
  <!-- Right Page -->
  <path d="M72 108 C92 100 107 100 112 104 V41 C107 37 92 37 72 45 V108 Z" fill="#FFFFFF"/>
  <!-- Spine -->
  <rect x="56" y="44" width="16" height="64" rx="4" fill="#CCFBF1"/>
  <line x1="64" y1="45" x2="64" y2="107" stroke="#0D9488" stroke-width="4"/>
  
  <!-- Lines on pages -->
  <line x1="25" y1="56" x2="48" y2="61" stroke="#0F766E" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="25" y1="72" x2="48" y2="77" stroke="#0F766E" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="25" y1="88" x2="48" y2="93" stroke="#0F766E" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="80" y1="61" x2="103" y2="56" stroke="#0F766E" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="80" y1="77" x2="103" y2="72" stroke="#0F766E" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="80" y1="93" x2="103" y2="88" stroke="#0F766E" stroke-width="4.5" stroke-linecap="round"/>
  
  <!-- AI Spark -->
  <path d="M64 6 C64 17 69 21 84 23 C69 25 64 29 64 40 C64 29 59 25 44 23 C59 21 64 17 64 6 Z" fill="#FEF08A"/>
  <circle cx="64" cy="23" r="5" fill="#FFFFFF"/>
</svg>"""
    }
}

os.makedirs('public/icons', exist_ok=True)

# Write SVGs
for size, info in ICONS.items():
    svg_path = f"public/icons/icon-{size}.svg"
    with open(svg_path, 'w') as f:
        f.write(info['svg'].strip())
    print(f"Wrote {svg_path}")

# Rasterize using swift AppKit CoreGraphics
swift_script = """
import AppKit

for size in [16, 32, 48, 128] {
    let svgPath = "public/icons/icon-\\(size).svg"
    let pngPath = "public/icons/icon-\\(size).png"
    
    let url = URL(fileURLWithPath: svgPath)
    guard let data = try? Data(contentsOf: url),
          let image = NSImage(data: data) else {
        fatalError("Failed to read \\(svgPath)")
    }
    
    let targetSize = NSSize(width: size, height: size)
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .calibratedRGB,
        bytesPerRow: size * 4,
        bitsPerPixel: 32
    ) else {
        fatalError("Failed to create NSBitmapImageRep for \\(size)")
    }
    
    if let dataPtr = rep.bitmapData {
        memset(dataPtr, 0, size * size * 4)
    }
    
    NSGraphicsContext.saveGraphicsState()
    guard let context = NSGraphicsContext(bitmapImageRep: rep) else {
        fatalError("Failed to create NSGraphicsContext for \\(size)")
    }
    NSGraphicsContext.current = context
    
    image.draw(in: NSRect(origin: .zero, size: targetSize),
               from: NSRect(origin: .zero, size: image.size),
               operation: .copy,
               fraction: 1.0)
               
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        fatalError("Failed to generate PNG for \\(size)")
    }
    
    try! pngData.write(to: URL(fileURLWithPath: pngPath))
    print("Generated \\(pngPath) [\\(size)x\\(size), \\(pngData.count) bytes]")
}
"""

with open("scripts/render_icons.swift", "w") as f:
    f.write(swift_script)

subprocess.check_call(["swift", "scripts/render_icons.swift"])
os.remove("scripts/render_icons.swift")
print("All icons successfully generated and rasterized at exact full sizes!")
