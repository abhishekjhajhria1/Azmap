# App icon

**One PNG is missing here: `Icon-App-1024x1024@1x.png`.**

Since Xcode 14 iOS needs exactly one 1024×1024 source image and generates every
other size itself, so this is the only file to produce. It is not in the repo
because it is a binary that no text-only toolchain can author — the Android side
sidesteps this with a vector launcher icon, but iOS requires raster here.

Until it exists the app builds and runs; it just shows a blank icon on the home
screen, and Xcode warns. **App Store submission will fail without it.**

The mark to reproduce is the one in
`android/app/src/main/res/drawable/ic_launcher.xml`: three white nodes and two
connecting edges on `#0071E3`. That is the map, which is what ABH is — not a
letter A and not a book.

No transparency and no rounded corners: iOS masks the icon itself, and an alpha
channel is an automatic rejection at upload.
