#!/bin/bash


if [[ -z "$TYEFI_ROOT" ]]; then
    echo "TYEFI_ROOT is not set, call this script by running 'lib/install_libs.sh'"
    exit 1
fi


#Set path to copy appimage and autolaunch location
APPIMAGE_PATH="$TYEFI_ROOT/bin/carplay.appimage"

if [[ -f "$APPIMAGE_PATH" ]]; then
	echo "carplay AppImage found at $APPIMAGE_PATH, skipping install"
else
	echo "carplay AppImage not found at $APPIMAGE_PATH, installing"
fi

#create udev rule thats specific to carlinkit device
echo "Creating udev rules"

FILE=/etc/udev/rules.d/52-nodecarplay.rules
echo "SUBSYSTEM==\"usb\", ATTR{idVendor}==\"1314\", ATTR{idProduct}==\"152*\", MODE=\"0660\", GROUP=\"plugdev\"" | sudo tee $FILE

if [[ $? -eq 0 ]]; then
	echo -e Permissions created'\n'
    else
	echo -e Unable to create permissions'\n'
fi
echo "checking for fuse packages"

REQUIRED_PKG="fuse"
PKG_OK=$(dpkg-query -W --showformat='${Status}\n' $REQUIRED_PKG|grep "install ok installed")
echo Checking for $REQUIRED_PKG: $PKG_OK
if [ "" = "$PKG_OK" ]; then
  echo "No $REQUIRED_PKG. Setting up $REQUIRED_PKG."
  sudo apt-get --yes install $REQUIRED_PKG
fi

REQUIRED_PKG="libfuse2"
PKG_OK=$(dpkg-query -W --showformat='${Status}\n' $REQUIRED_PKG|grep "install ok installed")
echo Checking for $REQUIRED_PKG: $PKG_OK
if [ "" = "$PKG_OK" ]; then
  echo "No $REQUIRED_PKG. Setting up $REQUIRED_PKG."
  sudo apt-get --yes install $REQUIRED_PKG
fi

echo "Downloading AppImage to $APPIMAGE_PATH"

if getconf LONG_BIT | grep -q '64'; then
	echo "64 Bit Detected"
	curl -L https://github.com/rhysmorgan134/react-carplay/releases/download/v4.0.5/react-carplay-4.0.5-arm64.AppImage --output $APPIMAGE_PATH
else
	echo "32 Bit OS not supported"
	exit 1
fi

echo "Download Done"

echo "Creating executable"
sudo chmod +x $APPIMAGE_PATH

# echo "Creating Autostart File"

# # sudo bash -c "echo '[Desktop Entry]
# # Name=File Manager
# # Exec=/home/$USER/Desktop/Carplay.AppImage
# # Type=Application' > /etc/xdg/autostart/carplay.desktop"

echo "All Done"
