from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from supabase import create_client, Client
import subprocess
import time
import os
from datetime import datetime

# Supabase credentials
SUPABASE_URL = "https://anrdbdndxykqexfgrzjo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucmRiZG5keHlrcWV4ZmdyempvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MTYyMzAsImV4cCI6MjA1Njk5MjIzMH0.VOnAog9yM0Gokc4WStxhXvwLAMIrsh7mxyZMg6ETNwk"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class FileChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith("output.tmp"):
            print("output.tmp has changed. Running strip_output.py...")
            #subprocess.run(["python", "strip_output.py", "output.tmp", "output.txt"])

            # Read the content of output.txt
            with open("output.txt", "r") as file:
                file_content = file.read()

            # Extract the content up until the first semicolon
            content_before_semicolon = self.extract_before_semicolon(file_content)

            # Insert the extracted content into Supabase database
            self.insert_to_supabase(content_before_semicolon)

    def extract_before_semicolon(self, content):
        # Find the first semicolon and return the substring before it
        semicolon_index = content.find(';')
        if semicolon_index != -1:
            return content[:semicolon_index]
        return content  # If no semicolon is found, return the whole content

    def insert_to_supabase(self, content):
        try:
            # Check if the content already exists in the output column
            existing_record = supabase.table("rec-output").select("output").eq("output", content).execute()

            if existing_record.data:  # If data is returned, the record exists
                print(f"Content '{content}' already exists, skipping insertion.")
            else:
                # Get the current timestamp for insertion
                timestamp = datetime.now().isoformat()

                # Insert the content into Supabase
                response = supabase.table("rec-output").insert({
                    "created_at": timestamp,
                    "output": content
                }).execute()

                if response.data:
                    print("Content uploaded to Supabase successfully!")
                else:
                    print(f"Failed to upload content. Response: {response}")
        except Exception as e:
            print(f"Error uploading to Supabase: {e}")

file_to_watch = "output.tmp"
directory_to_watch = os.path.dirname(os.path.abspath(file_to_watch))

event_handler = FileChangeHandler()
observer = Observer()
observer.schedule(event_handler, path=directory_to_watch, recursive=False)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()