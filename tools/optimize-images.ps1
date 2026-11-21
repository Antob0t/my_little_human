param(
  [int]$MaxSize = 1200,
  [int]$Quality = 85
)

Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class AlphaTrim {
  public static Rectangle Bounds(Bitmap src) {
    Bitmap b = src.Clone(new Rectangle(0, 0, src.Width, src.Height), PixelFormat.Format32bppArgb);
    BitmapData d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    byte[] px = new byte[d.Stride * b.Height];
    Marshal.Copy(d.Scan0, px, 0, px.Length);
    int minX = b.Width, minY = b.Height, maxX = -1, maxY = -1;
    for (int y = 0; y < b.Height; y++)
      for (int x = 0; x < b.Width; x++)
        if (px[y * d.Stride + x * 4 + 3] > 8) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
    b.UnlockBits(d); b.Dispose();
    if (maxX < 0) return new Rectangle(0, 0, src.Width, src.Height);
    return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
  }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'assets\img'
$dst  = Join-Path $root 'assets\web'

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)

Get-ChildItem $src -Recurse -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|gif)$' } | ForEach-Object {
  $rel = $_.FullName.Substring($src.Length + 1)
  $out = Join-Path $dst $rel
  New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null

  if ($_.Extension -eq '.gif') {
    Copy-Item $_.FullName $out -Force
    "copy    $rel"
    return
  }

  $img = New-Object System.Drawing.Bitmap $_.FullName

  $crop = if ($_.Extension -eq '.png') { [AlphaTrim]::Bounds($img) } else { New-Object System.Drawing.Rectangle 0, 0, $img.Width, $img.Height }
  $max = if ($rel -like 'ui\*') { 700 } else { $MaxSize }
  $scale = [Math]::Min(1.0, $max / [Math]::Max($crop.Width, $crop.Height))
  $w = [int]($crop.Width * $scale); $h = [int]($crop.Height * $scale)

  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), $crop, [System.Drawing.GraphicsUnit]::Pixel)

  if ($_.Extension -eq '.png') {
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  } else {
    $bmp.Save($out, $jpgCodec, $params)
  }
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  "{0,-7} {1}  ({2}x{3}, {4:N0} KB)" -f 'resize', $rel, $w, $h, ((Get-Item $out).Length / 1KB)
}

$logoSrc = Join-Path $src 'ui\logo.png'
if (Test-Path $logoSrc) {
  $logo = New-Object System.Drawing.Bitmap $logoSrc
  $crop = [AlphaTrim]::Bounds($logo)
  $icons = @(
    @{ name = 'favicon-32.png';        size = 32;  bg = $null;     pad = 0    },
    @{ name = 'favicon-180.png';       size = 180; bg = '#ffd93b'; pad = 0.08 },
    @{ name = 'favicon-192.png';       size = 192; bg = $null;     pad = 0    },
    @{ name = 'icon-512.png';          size = 512; bg = $null;     pad = 0.03 },
    @{ name = 'icon-maskable-512.png'; size = 512; bg = '#ffd93b'; pad = 0.18 }
  )
  foreach ($ic in $icons) {
    $size = $ic.size
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    if ($ic.bg) { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($ic.bg)) }
    $pad = [int]($size * $ic.pad)
    $box = $size - 2 * $pad
    $scale = $box / [Math]::Max($crop.Width, $crop.Height)
    $w = [int]($crop.Width * $scale); $h = [int]($crop.Height * $scale)
    $dest = New-Object System.Drawing.Rectangle ([int](($size - $w) / 2)), ([int](($size - $h) / 2)), $w, $h
    $g.DrawImage($logo, $dest, $crop, [System.Drawing.GraphicsUnit]::Pixel)
    $out = Join-Path $dst $ic.name
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    "icon    $($ic.name)"
  }
  $logo.Dispose()
}
