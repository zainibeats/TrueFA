import sys
import time
import re
import cv2
import pyotp
import urllib.parse
import os
import numpy as np

class TwoFactorAuth:
    def __init__(self):
        self.secret = None
        self.qr_detector = cv2.QRCodeDetector()

    def extract_secret_from_qr(self, image_path):
        # Extract secret key from QR code image
        try:
            # Clean up path and make absolute
            image_path = os.path.abspath(image_path.strip().strip("'").strip('"'))
            
            # Check file exists
            if not os.path.exists(image_path):
                return None, f"File not found: {image_path}"
            
            # Read image
            image = cv2.imread(image_path)
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