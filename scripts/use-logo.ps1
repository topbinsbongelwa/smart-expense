param(
  [Parameter(Mandatory = $true)][string]$ImagePath,
  [int]$Size = 1024
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets\images'
$source = (Resolve-Path -LiteralPath $ImagePath).Path

$image = [System.Drawing.Image]::FromFile($source)
$bitmap = New-Object System.Drawing.Bitmap($image)
$width = $image.Width
$height = $image.Height

$minX = $width; $minY = $height; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $height; $y++) {
  for ($x = 0; $x -lt $width; $x++) {
    $pixel = $bitmap.GetPixel($x, $y)
    if ($pixel.A -gt 16 -and ($pixel.R -lt 248 -or $pixel.G -lt 248 -or $pixel.B -lt 248)) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

if ($maxX -lt 0) { throw 'No non-white content found in the image.' }

$side = [Math]::Max($maxX - $minX + 1, $maxY - $minY + 1)
$padding = [int]($side * 0.06)
$canvas = $side + ($padding * 2)
$centerX = [int](($minX + $maxX) / 2)
$centerY = [int](($minY + $maxY) / 2)
$cropX = [Math]::Max(0, $centerX - [int]($canvas / 2))
$cropY = [Math]::Max(0, $centerY - [int]($canvas / 2))

"content box: ${minX},${minY} -> ${maxX},${maxY}  side=$side"

function Export-Logo([string]$destination, [int]$edge, [double]$scale) {
  $target = New-Object System.Drawing.Bitmap($edge, $edge)
  $target.SetResolution(144, 144)
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::White)
  $draw = [int]($edge * $scale)
  $offset = [int](($edge - $draw) / 2)
  $graphics.DrawImage(
    $bitmap,
    (New-Object System.Drawing.Rectangle($offset, $offset, $draw, $draw)),
    (New-Object System.Drawing.Rectangle($cropX, $cropY, $canvas, $canvas)),
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $target.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $target.Dispose()
  "wrote $destination ($edge x $edge)"
}

Export-Logo (Join-Path $assets 'iskhwama-logo.png') $Size 1
Export-Logo (Join-Path $assets 'icon.png') $Size 1
Export-Logo (Join-Path $assets 'splash-icon.png') 512 0.72
Export-Logo (Join-Path $assets 'android-icon-foreground.png') $Size 0.62

$bitmap.Dispose()
$image.Dispose()
