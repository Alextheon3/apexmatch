# test_env.py
import os
from dotenv import load_dotenv

print("=== Before loading .env ===")
print(f"OPENAI_API_KEY: {os.getenv('OPENAI_API_KEY', 'NOT FOUND')}")
print(f"ANTHROPIC_API_KEY: {os.getenv('ANTHROPIC_API_KEY', 'NOT FOUND')}")

# Explicitly load .env
load_dotenv()

print("\n=== After loading .env ===")
openai_key = os.getenv('OPENAI_API_KEY', 'NOT FOUND')
anthropic_key = os.getenv('ANTHROPIC_API_KEY', 'NOT FOUND')

print(f"OPENAI_API_KEY: {openai_key[:20] if openai_key != 'NOT FOUND' else 'NOT FOUND'}...")
print(f"ANTHROPIC_API_KEY: {anthropic_key[:20] if anthropic_key != 'NOT FOUND' else 'NOT FOUND'}...")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT FOUND')}")

# Check if .env file exists
if os.path.exists('.env'):
    print("\n✅ .env file found")
    with open('.env', 'r') as f:
        lines = f.readlines()
        print(f"✅ .env file has {len(lines)} lines")
        
        # Check for API key lines (without showing the actual keys)
        openai_line = any('OPENAI_API_KEY' in line for line in lines)
        anthropic_line = any('ANTHROPIC_API_KEY' in line for line in lines)
        
        print(f"✅ OPENAI_API_KEY line found: {openai_line}")
        print(f"✅ ANTHROPIC_API_KEY line found: {anthropic_line}")
else:
    print("\n❌ .env file NOT found")