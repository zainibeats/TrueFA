import sys
import time
import re
import cv2
import pyotp
import urllib.parse
import os
import numpy as np
from pathlib import Path
import signal
import ctypes
import platform
from datetime import datetime

class SecureString:
    def __init__(self, string):
        self._string = string
        self._creation_time = datetime.now()
        
    def __del__(self):
        self.clear()
        
    def clear(self):
        if hasattr(self, '_string'):
            # Overwrite the string with zeros
            ctypes.memset(id(self._string) + 20, 0, len(self._string))
            self._string = None
            self._creation_time = None
            
    def get(self):
        return self._string if hasattr(self, '_string') else None

    def age(self):
        """Get age of secret in seconds"""
        if not hasattr(self, '_creation_time') or not self._creation_time:
            return float('inf')
        return (datetime.now() - self._creation_time).total_seconds()

class TwoFactorAuth:
    def __init__(self):
        self.secret = None
        self.qr_detector = cv2.QRCodeDetector()
        self.images_dir = os.getenv('QR_IMAGES_DIR', os.path.join(os.getcwd(), 'images'))
        self.is_generating = False
        # Register signal handlers for secure cleanup
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle program termination securely"""
        if self.is_generating:
            self.is_generating = False
            return
        self.cleanup()
        print("\nExiting securely...")
        sys.exit(0)

    def cleanup(self):
        """Secure cleanup of sensitive data"""
        if self.secret:
            self.secret.clear()
            self.secret = None

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
            
            # Clear the image data from memory
            image = None
            
            if not retval or not decoded_info:
                return None, "No QR code found in the image"
            
            # Find valid otpauth URL in decoded QR codes
            for qr_data in decoded_info:
                if str(qr_data).startswith('otpauth://'):
                    # Parse URL for secret
                    parsed = urllib.parse.urlparse(qr_data)
                    params = dict(urllib.parse.parse_qsl(parsed.query))
                    
                    if 'secret' in params:
                        # Wrap the secret in SecureString
                        return SecureString(params['secret']), None
            
            return None, "No valid otpauth URL found in QR codes"
            
        except Exception as e:
            return None, "Error processing image"  # Generic error message for security

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
                print("Warning: Access to files outside the images directory is not allowed")
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
        secret = self.secret.get()
        if not secret:
            return None
        totp = pyotp.TOTP(secret)
        return totp.now()

    def get_remaining_time(self):
        # Get seconds until next code rotation
        return 30 - (int(time.time()) % 30)

def clear_screen():
    """Clear the terminal screen securely"""
    if platform.system().lower() == "windows":
        os.system('cls')
    else:
        os.system('clear')

def main():
    auth = TwoFactorAuth()
    
    try:
        # Print the images directory location
        print(f"\nNote: Place your QR code images in: {auth.images_dir}")
        print("You can use either the full path or just the filename if it's in the images directory")
        
        while True:
            # Auto-cleanup of old secrets (e.g., after 5 minutes)
            if auth.secret and auth.secret.age() > 300:  # 5 minutes
                print("\nAuto-clearing old secret for security...")
                auth.cleanup()

            print("\n=== TrueFA ===")
            print("1. Load QR code from image")
            print("2. Enter secret key manually")
            print("3. Clear screen")
            print("4. Exit")
            
            choice = input("\nEnter your choice (1-4): ")
            
            if choice == '1':
                # Auto-cleanup before new secret
                if auth.secret:
                    auth.cleanup()
                
                image_path = input("Enter the path to the QR code image: ")
                secret, error = auth.extract_secret_from_qr(image_path)
                
                if error:
                    print(f"Error: {error}")
                    continue
                    
                auth.secret = secret
                print("Secret key successfully extracted from QR code!")
                
            elif choice == '2':
                # Auto-cleanup before new secret
                if auth.secret:
                    auth.cleanup()
                
                secret_input = input("Enter the secret key: ").strip()
                if not auth.validate_secret(secret_input):
                    print("Error: Invalid secret key format. Must be base32 encoded.")
                    continue
                    
                auth.secret = SecureString(secret_input)
                print("Secret key successfully set!")
                
            elif choice == '3':
                clear_screen()
                continue
                
            elif choice == '4':
                auth.cleanup()
                print("Goodbye!")
                sys.exit(0)
                
            else:
                print("Invalid choice. Please try again.")
                continue
                
            # Generate codes if secret is set
            if auth.secret:
                print("\nGenerating TOTP codes. Press Ctrl+C to stop.")
                auth.is_generating = True
                try:
                    while auth.is_generating:
                        code = auth.generate_code()
                        remaining = auth.get_remaining_time()
                        print(f"\rCurrent code: {code} (refreshes in {remaining}s)", end='', flush=True)
                        time.sleep(1)
                except KeyboardInterrupt:
                    auth.is_generating = False
                    print("\nStopped code generation.")
                    # Don't clear the secret here, let it auto-clear after timeout

    except Exception as e:
        # Secure cleanup on any exception
        auth.cleanup()
        print("\nAn error occurred. Exiting securely...")
        sys.exit(1)

if __name__ == "__main__":
    main() 