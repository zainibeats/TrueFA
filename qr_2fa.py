import sys
import time
import re
import cv2
import pyotp
import urllib.parse
from zxing import BarCodeReader

class TwoFactorAuth:
    def __init__(self):
        self.secret = None
        self.reader = BarCodeReader()

    def extract_secret_from_qr(self, image_path):
        """Extract the secret key from a QR code image."""
        try:
            # Read the image using OpenCV
            image = cv2.imread(image_path)
            if image is None:
                return None, "Could not read the image file"
            
            # Convert BGR to RGB (zxing expects RGB)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Decode QR code
            result = self.reader.decode(image_rgb)
            
            if not result:
                return None, "No QR code found in the image"
            
            # Get the QR code data
            qr_data = result.raw
            
            # Parse the otpauth URL
            if not str(qr_data).startswith('otpauth://'):
                return None, "Invalid QR code format: Not a valid otpauth URL"
            
            # Parse the URL to get the secret
            parsed = urllib.parse.urlparse(qr_data)
            params = dict(urllib.parse.parse_qsl(parsed.query))
            
            if 'secret' not in params:
                return None, "No secret key found in QR code"
                
            return params['secret'], None
            
        except Exception as e:
            return None, f"Error processing image: {str(e)}"

    def validate_secret(self, secret):
        """Validate the format of the secret key."""
        # Remove spaces and convert to uppercase
        secret = secret.strip().upper()
        
        # Check if the secret is base32 encoded
        base32_pattern = r'^[A-Z2-7]+=*$'
        if not re.match(base32_pattern, secret):
            return False
            
        return True

    def generate_code(self):
        """Generate the current TOTP code."""
        if not self.secret:
            return None
            
        totp = pyotp.TOTP(self.secret)
        return totp.now()

    def get_remaining_time(self):
        """Get remaining time until next code rotation."""
        return 30 - (int(time.time()) % 30)

def main():
    auth = TwoFactorAuth()
    
    while True:
        print("\n=== 2FA Code Generator ===")
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
            
        # If we have a valid secret, start generating codes
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