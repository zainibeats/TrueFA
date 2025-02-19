import sys
import time
import re
import cv2
import pyotp
import urllib.parse
import os
import numpy as np
from pathlib import Path

class TwoFactorAuth:
    def __init__(self):
        self.secret = None
        self.qr_detector = cv2.QRCodeDetector()
        self.images_dir = os.getenv('QR_IMAGES_DIR', os.path.join(os.getcwd(), 'images'))

    def extract_secret_from_qr(self, image_path):
        # Extract secret key from QR code image
        try:
            # Clean up and validate the image path
            image_path = self._validate_image_path(image_path)
            if not image_path:
                return None, "Invalid image path or file not found"
            
            # Read image
            image = cv2.imread(str(image_path))
            if image is None:
                return None, f"Could not read the image file: {image_path}"
            
            # Decode QR code
            retval, decoded_info, points, straight_qrcode = self.qr_detector.detectAndDecodeMulti(image)
            
            if not retval or not decoded_info:
                return None, "No QR code found in the image"
            
            # Find valid otpauth URL in decoded QR codes
            for qr_data in decoded_info:
                if str(qr_data).startswith('otpauth://'):
                    # Parse URL for secret
                    parsed = urllib.parse.urlparse(qr_data)
                    params = dict(urllib.parse.parse_qsl(parsed.query))
                    
                    if 'secret' in params:
                        return params['secret'], None
            
            return None, "No valid otpauth URL found in QR codes"
            
        except Exception as e:
            return None, f"Error processing image: {str(e)}"

    def _validate_image_path(self, image_path):
        """Validate and resolve the image path securely"""
        try:
            # Clean up the path
            image_path = image_path.strip().strip("'").strip('"')
            
            # Convert to Path object for secure path manipulation
            path = Path(image_path)
            
            # If path is relative, assume it's relative to images_dir
            if not path.is_absolute():
                path = Path(self.images_dir) / path
            
            # Resolve path and check if it's within allowed directory
            resolved_path = path.resolve()
            images_dir_resolved = Path(self.images_dir).resolve()
            
            # Check if the path is within the allowed directory
            if not str(resolved_path).startswith(str(images_dir_resolved)):
                print(f"Warning: Access to files outside {self.images_dir} is not allowed")
                return None
            
            # Check if file exists and is a file
            if not resolved_path.is_file():
                return None
                
            return resolved_path
            
        except Exception:
            return None

    def validate_secret(self, secret):
        # Validate base32 encoded secret key format
        secret = secret.strip().upper()
        base32_pattern = r'^[A-Z2-7]+=*$'
        if not re.match(base32_pattern, secret):
            return False
        return True

    def generate_code(self):
        # Generate current TOTP code
        if not self.secret:
            return None
        totp = pyotp.TOTP(self.secret)
        return totp.now()

    def get_remaining_time(self):
        # Get seconds until next code rotation
        return 30 - (int(time.time()) % 30)

def main():
    auth = TwoFactorAuth()
    
    # Print the images directory location
    print(f"\nNote: Place your QR code images in: {auth.images_dir}")
    print("You can use either the full path or just the filename if it's in the images directory")
    
    while True:
        print("\n=== TrueFA ===")
        print("1. Load QR code from image")
        print("2. Enter secret key manually")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == '1':
            image_path = input("Enter the path to the QR code image: ")
            secret, error = auth.extract_secret_from_qr(image_path)
            
            if error:
                print(f"Error: {error}")
                continue
                
            auth.secret = secret
            print("Secret key successfully extracted from QR code!")
            
        elif choice == '2':
            secret = input("Enter the secret key: ").strip()
            if not auth.validate_secret(secret):
                print("Error: Invalid secret key format. Must be base32 encoded.")
                continue
                
            auth.secret = secret
            print("Secret key successfully set!")
            
        elif choice == '3':
            print("Goodbye!")
            sys.exit(0)
            
        else:
            print("Invalid choice. Please try again.")
            continue
            
        # Generate codes if secret is set
        if auth.secret:
            print("\nGenerating TOTP codes. Press Ctrl+C to stop.")
            try:
                while True:
                    code = auth.generate_code()
                    remaining = auth.get_remaining_time()
                    print(f"\rCurrent code: {code} (refreshes in {remaining}s)", end='', flush=True)
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\nStopped code generation.")

if __name__ == "__main__":
    main() 