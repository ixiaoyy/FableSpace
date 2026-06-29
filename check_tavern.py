# -*- coding: utf-8 -*-
import sqlite3
import json

conn = sqlite3.connect('.fablemap-api/fablemap.sqlite3')
conn.text_factory = lambda b: b.decode('utf-8', errors='ignore')
c = conn.cursor()

# Find taverns with 纪念币 in name
c.execute("SELECT id, name FROM taverns")
for row in c.fetchall():
    if '纪念币' in row[1] or '茶' in row[1]:
        print(f'Tavern: {row[0]} - {row[1]}')

# Check characters for this tavern
print("\n--- Characters in pw_lantern_helpdesk ---")
c.execute("SELECT id, tavern_id, name, first_mes FROM characters WHERE tavern_id = 'pw_lantern_helpdesk'")
for row in c.fetchall():
    print(f"Character: {row[2]}")
    print(f"First message: {row[3][:200] if row[3] else 'None'}...")
    print()

# Check llm_configs
print("--- Taverns with LLM Configs ---")
c.execute("SELECT tavern_id, backend, model, base_url FROM llm_configs")
for row in c.fetchall():
    print(f"Tavern: {row[0]}, Backend: {row[1]}, Model: {row[2]}, Base: {row[3]}")

# Find taverns with 纪念币 or 茶 in name
print("\n--- Taverns with 纪念币 or 茶 ---")
c.execute("SELECT id, name FROM taverns")
for row in c.fetchall():
    if '纪念币' in row[1] or '茶' in row[1]:
        tavern_id = row[0]
        print(f"Tavern: {tavern_id} - {row[1]}")
        # Check if this tavern has LLM config
        c.execute("SELECT backend, model FROM llm_configs WHERE tavern_id = ?", (tavern_id,))
        llm = c.fetchone()
        if llm:
            print(f"  LLM: {llm[0]} / {llm[1]}")
        else:
            print(f"  LLM: NO CONFIG")

conn.close()
