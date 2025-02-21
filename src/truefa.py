# #imports #system
import sys
import time
import re
import os
from pathlib import Path
import signal
import ctypes
import platform
from datetime import datetime
import mmap

# #imports #security
import secrets
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
import base64
import json
import gnupg

# #imports #qr-processing
from PIL import Image
from pyzbar.pyzbar import decode
import pyotp
import urllib.parse

# #security #memory-protection
class SecureMemory:
    """Secure memory handler with page locking and secure wiping"""
    
    # #init #memory-allocation
    def __init__(self, size=4096):
        self.size = size
        self.mm = None
        try:
            # Create a memory map with read/write access
            self.mm = mmap.mmap(-1, self.size, mmap.MAP_PRIVATE | mmap.MAP_ANONYMOUS, mmap.PROT_READ | mmap.PROT_WRITE)
            if platform.system() != 'Windows':
                # Lock memory to prevent swapping (Unix-like systems only)
                try:
                    import resource
                    resource.mlock(self.mm)
                except Exception:
                    pass  # If mlock isn't available, continue without it
            else:
                try:
                    kernel32 = ctypes.windll.kernel32
                    # Create a ctypes char buffer from the mmap object
                    address = ctypes.addressof(ctypes.c_char.from_buffer(self.mm))
                    if not kernel32.VirtualLock(address, ctypes.c_size_t(self.size)):
                        print("Warning: Failed to lock memory on Windows")
                except Exception as e:
                    print("Warning: Windows memory locking failed:", e)
        except Exception:
            pass  # Handle initialization failures gracefully

    def __del__(self):
        try:
            self.secure_wipe()
        except Exception:
            pass  # Ignore cleanup errors in destructor

    # #security #cleanup
    def secure_wipe(self):
        """Securely wipe memory multiple times"""
        if self.mm is not None and hasattr(self.mm, 'write'):
            try:
                for _ in range(3):
                    self.mm.seek(0)
                    # Using ctypes.memset on the buffer for more secure wiping
                    buf = (ctypes.c_char * self.size).from_buffer(self.mm)
                    ctypes.memset(ctypes.addressof(buf), 0, self.size)
                self.mm.close()
            except Exception:
                pass  # Handle wiping errors gracefully
            finally:
                self.mm = None

# #security #string-protection
class SecureString:
    # #init #secure-storage
    def __init__(self, string):
        self._memory = None
        self._size = len(string)
        self._creation_time = datetime.now()
        try:
            self._memory = SecureMemory()
            if self._memory.mm is not None:
                # Store the string in secured memory
                self._memory.mm.seek(0)
                self._memory.mm.write(string.encode())
        except Exception:
            self._memory = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.clear()
            
    def __del__(self):
        try:
            self.clear()
        except Exception:
            pass  # Ignore cleanup errors in destructor
        
    # #security #cleanup
    def clear(self):
        if self._memory is not None:
            try:
                self._memory.secure_wipe()
            except Exception:
                pass  # Handle wiping errors gracefully
            finally:
                self._memory = None
                self._size = 0
                self._creation_time = None
            
    # #security #access
    def get(self):
        if self._memory is None or self._memory.mm is None:
            return None
        try:
            self._memory.mm.seek(0)
            return self._memory.mm.read(self._size).decode()
        except Exception:
            return None

    def age(self):
        """Get age of secret in seconds"""
        if self._creation_time is None:
            return float('inf')
        return (datetime.now() - self._creation_time).total_seconds()

# #security #storage
class SecureStorage:
    """Handles secure storage of TOTP secrets and master password"""
    
    # #init #filesystem
    def __init__(self):
        self.salt = None
        self.key = None
        self.master_hash = None
        self.is_unlocked = False
        self.storage_path = os.path.expanduser('~/.truefa')
        self.exports_path = os.path.join(self.storage_path, 'exports')
        os.makedirs(self.storage_path, mode=0o700, exist_ok=True)
        os.makedirs(self.exports_path, mode=0o700, exist_ok=True)
        self.gnupg_home = os.path.join(self.storage_path, '.gnupg')
        os.makedirs(self.gnupg_home, mode=0o700, exist_ok=True)
        
        # Try to set permissions, but don't fail if we can't (e.g., mounted volume)
        try:
            os.chmod(self.storage_path, 0o700)
        except Exception:
            # Check if we can at least write to the directory
            test_file = os.path.join(self.storage_path, '.test')
            try:
                with open(test_file, 'w') as f:
                    f.write('test')
                os.remove(test_file)
            except Exception as e:
                raise Exception(f"Storage directory is not writable: {e}")
        
        # Load master password hash if it exists
        self.master_file = os.path.join(self.storage_path, '.master')
        if os.path.exists(self.master_file):
            try:
                with open(self.master_file, 'r') as f:
                    data = json.load(f)
                    self.master_hash = base64.b64decode(data['hash'])
                    self.salt = base64.b64decode(data['salt'])
            except Exception:
                pass

    def has_master_password(self):
        """Check if a master password has been set"""
        return self.master_hash is not None

    # #security #authentication
    def verify_master_password(self, password):
        """Verify the master password"""
        if not self.master_hash or not self.salt:
            return False
        try:
            kdf = Scrypt(
                salt=self.salt,
                length=32,
                n=2**14,
                r=8,
                p=1,
            )
            kdf.verify(password.encode(), self.master_hash)
            self.derive_key(password)  # Set up encryption key
            self.is_unlocked = True
            return True
        except Exception:
            return False

    def set_master_password(self, password):
        """Set up the master password"""
        self.salt = secrets.token_bytes(16)
        kdf = Scrypt(
            salt=self.salt,
            length=32,
            n=2**14,
            r=8,
            p=1,
        )
        self.master_hash = kdf.derive(password.encode())
        
        # Save master password hash
        data = {
            'hash': base64.b64encode(self.master_hash).decode('utf-8'),
            'salt': base64.b64encode(self.salt).decode('utf-8')
        }
        with open(self.master_file, 'w') as f:
            json.dump(data, f)
        
        # Set up encryption key
        self.derive_key(password)
        self.is_unlocked = True

    # #security #key-management
    def derive_key(self, password):
        """Derive encryption key from password using Scrypt"""
        if not self.salt:
            self.salt = secrets.token_bytes(16)
        kdf = Scrypt(
            salt=self.salt,
            length=32,
            n=2**14,
            r=8,
            p=1,
        )
        self.key = kdf.derive(password.encode())

    # #security #encryption
    def encrypt_secret(self, secret, name):
        """Encrypt a TOTP secret"""
        if not self.key:
            raise ValueError("No encryption key set")
        
        # Generate a random nonce
        nonce = secrets.token_bytes(12)
        
        # Create cipher
        aesgcm = AESGCM(self.key)
        
        # Encrypt the secret
        ciphertext = aesgcm.encrypt(
            nonce,
            secret.encode(),
            name.encode()  # Use name as associated data
        )
        
        # Combine salt, nonce, and ciphertext for storage
        return base64.b64encode(self.salt + nonce + ciphertext).decode('utf-8')

    # #security #decryption
    def decrypt_secret(self, encrypted_data, name):
        """Decrypt a TOTP secret"""
        if not self.is_unlocked or not self.key:
            return None
            
        try:
            # Decode the combined data
            data = base64.b64decode(encrypted_data.encode('utf-8'))
            
            # Extract components
            salt = data[:16]
            nonce = data[16:28]
            ciphertext = data[28:]
            
            # Decrypt
            aesgcm = AESGCM(self.key)
            plaintext = aesgcm.decrypt(
                nonce,
                ciphertext,
                name.encode()  # Use name as associated data
            )
            
            return plaintext.decode('utf-8')
        except Exception:
            return None

    def load_secret(self, name):
        """Load a secret from storage."""
        if not self.is_unlocked:
            return None
        
        try:
            with open(os.path.join(self.storage_path, f"{name}.enc"), 'r') as f:
                return f.read()
        except Exception:
            return None

    def load_all_secrets(self):
        """Load all secrets from storage."""
        if not self.is_unlocked:
            return {}
        
        secrets = {}
        try:
            for filename in os.listdir(self.storage_path):
                if filename.endswith('.enc'):
                    name = filename[:-4]  # Remove .enc extension
                    secret = self.load_secret(name)
                    if secret:
                        secrets[name] = secret
        except Exception as e:
            print(f"Error loading secrets: {str(e)}")
            return {}
        
        return secrets

    # #storage #export
    def export_secrets(self, export_path, password):
        """Export secrets as an encrypted file."""
        if not self.verify_master_password(password):
            print("Master password verification failed")
            return False
        
        if not export_path:
            print("Export cancelled.")
            return False
        
        # Clean up the export path
        export_path = export_path.strip('"').strip("'")
        
        # If it's a Windows path, convert it to a filename
        if '\\' in export_path or ':' in export_path:
            export_path = os.path.basename(export_path)
        
        # Ensure the export path has .gpg extension
        if not export_path.endswith('.gpg'):
            export_path += '.gpg'
        
        # If path is not absolute, put it in the exports directory
        if not os.path.isabs(export_path):
            export_path = os.path.join(self.exports_path, export_path)
        
        try:
            # Create a temporary file for the export
            temp_export = os.path.join(self.exports_path, '.temp_export')
            
            # Write secrets to temporary file
            with open(temp_export, 'w') as f:
                json.dump(self.load_all_secrets(), f, indent=4)
            
            # Set up GPG with custom home directory
            gpg = gnupg.GPG(gnupghome=self.gnupg_home)
            
            # Read the temporary file
            with open(temp_export, 'rb') as f:
                # Encrypt the file
                encrypted_data = gpg.encrypt_file(
                    f,
                    recipients=None,
                    symmetric=True,
                    passphrase=password,
                    output=export_path
                )
            
            # Clean up temporary file
            os.remove(temp_export)
            
            if encrypted_data.ok:
                print(f"Secrets exported to {export_path}")
                return True
            else:
                print(f"GPG encryption failed: {encrypted_data.status}")
                return False
            
        except Exception as e:
            print(f"Export failed: {str(e)}")
            return False

# #app #main-class
class TwoFactorAuth:
    # #init #setup
    def __init__(self):
        self.secret = None
        self.images_dir = os.getenv('QR_IMAGES_DIR', os.path.join(os.getcwd(), 'images'))
        self.is_generating = False
        self.storage = SecureStorage()
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

    # #security #cleanup
    def cleanup(self):
        """Secure cleanup of sensitive data"""
        if self.secret:
            self.secret.clear()
            self.secret = None

    # #qr #processing
    def extract_secret_from_qr(self, image_path):
        # Extract secret key from QR code image
        try:
            # Clean up and validate the image path
            image_path = self._validate_image_path(image_path)
            if not image_path:
                return None, "Invalid image path or file not found"
            
            # Read image using PIL
            try:
                image = Image.open(str(image_path))
            except Exception:
                return None, f"Could not read the image file: {image_path}"
            
            # Decode QR code using pyzbar
            decoded_objects = decode(image)
            
            # Clear the image data from memory
            image.close()
            image = None
            
            if not decoded_objects:
                return None, "No QR code found in the image"
            
            # Find valid otpauth URL in decoded QR codes
            for decoded_obj in decoded_objects:
                qr_data = decoded_obj.data.decode('utf-8')
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

    # #security #validation
    def validate_secret(self, secret):
        # Validate base32 encoded secret key format
        secret = secret.strip().upper()
        base32_pattern = r'^[A-Z2-7]+=*$'
        if not re.match(base32_pattern, secret):
            return False
        return True

    # #totp #generation
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

    # #security #authentication
    def ensure_unlocked(self, purpose="continue"):
        """Ensure storage is unlocked with master password"""
        if not self.storage.is_unlocked:
            if not self.storage.has_master_password():
                print("\nYou need to set up a master password to", purpose)
                while True:
                    password = input("Enter new master password: ")
                    if not password:
                        return False
                    confirm = input("Confirm master password: ")
                    if password == confirm:
                        self.storage.set_master_password(password)
                        return True
                    print("Passwords don't match. Try again.")
            else:
                print("\nStorage is locked. Please enter your master password to", purpose)
                attempts = 3
                while attempts > 0:
                    password = input("Enter master password: ")
                    if self.storage.verify_master_password(password):
                        return True
                    attempts -= 1
                    if attempts > 0:
                        print(f"Incorrect password. {attempts} attempts remaining.")
                return False
        return True

    def export_secrets(self):
        """Export secrets to GPG encrypted file"""
        if not self.ensure_unlocked("export secrets"):
            return
            
        output_path = input("\nEnter path for exported file (will be encrypted): ").strip()
        if not output_path:
            print("Export cancelled.")
            return
            
        if not output_path.endswith('.gpg'):
            output_path += '.gpg'
            
        password = input("Enter password for GPG encryption: ")
        if not password:
            print("Export cancelled.")
            return
            
        self.storage.export_secrets(output_path, password)

# #utils #screen
def clear_screen():
    """Clear the terminal screen securely"""
    if platform.system().lower() == "windows":
        os.system('cls')
    else:
        os.system('clear')

# #app #entry-point
def main():
    """Main application entry point and UI loop"""
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
            print("3. Save current secret")
            print("4. Load saved secret")
            print("5. Export secrets")
            print("6. Clear screen")
            print("7. Exit")
            
            choice = input("\nEnter your choice (1-7): ")
            
            if choice == '1':
                # Auto-cleanup before new secret
                if auth.secret:
                    auth.cleanup()
                
                image_path = input("Enter the path to the QR code image: ")
                secret, error = auth.extract_secret_from_qr(image_path)
                
                if error:
                    print(f"Error: {error}")
                    continue
                    
                # Require master password before showing codes
                if not auth.ensure_unlocked("view 2FA codes"):
                    auth.cleanup()
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
                    
                # Require master password before showing codes
                if not auth.ensure_unlocked("view 2FA codes"):
                    continue
                    
                auth.secret = SecureString(secret_input)
                print("Secret key successfully set!")

            elif choice == '3':
                if not auth.secret:
                    print("No secret currently set!")
                    continue
                
                if not auth.ensure_unlocked("save the secret"):
                    continue
                
                name = input("Enter a name for this secret: ").strip()
                if not name:
                    print("Name cannot be empty!")
                    continue
                
                try:
                    with SecureString(auth.secret.get()) as temp_secret:
                        encrypted = auth.storage.encrypt_secret(temp_secret.get(), name)
                    
                    # Save to file
                    with open(os.path.join(auth.storage.storage_path, f"{name}.enc"), "w") as f:
                        f.write(encrypted)
                    
                    print(f"Secret saved as '{name}'")
                except Exception as e:
                    print("Error saving secret!")
                    continue

            elif choice == '4':
                if not auth.ensure_unlocked("load saved secrets"):
                    continue
                    
                name = input("Enter the name of the secret to load: ").strip()
                if not name:
                    print("Name cannot be empty!")
                    continue
                
                file_path = os.path.join(auth.storage.storage_path, f"{name}.enc")
                if not os.path.exists(file_path):
                    print(f"No saved secret found with name '{name}'")
                    continue
                
                try:
                    with open(file_path, "r") as f:
                        encrypted = f.read()
                    
                    decrypted = auth.storage.decrypt_secret(encrypted, name)
                    if not decrypted:
                        print("Failed to decrypt secret")
                        continue
                    
                    # Auto-cleanup before new secret
                    if auth.secret:
                        auth.cleanup()
                    
                    auth.secret = SecureString(decrypted)
                    print(f"Secret '{name}' loaded successfully!")
                except Exception as e:
                    print("Error loading secret!")
                    continue

            elif choice == '5':
                try:
                    auth.export_secrets()
                except Exception as e:
                    print(f"Export failed: {str(e)}")
                continue
                
            elif choice == '6':
                clear_screen()
                continue
                
            elif choice == '7':
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