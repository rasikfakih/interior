import os
import re

base_dir = "src/app"

def fix_file(path, replacements):
    full_path = os.path.join(path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        return

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in replacements:
        content = content.replace(old, new)

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {full_path}")

# Fix journal route
fix_file("src/app/api/journal/route.ts", [
    ('values(data NGX{data)', 'values(data)'),
])

# Fix projects slug page
content = open("src/app/projects/[slug]/page.tsx", 'r', encoding='utf-8').read()
content = content.replace('(style)="..."', '')
with open("src/app/projects/[slug]/page.tsx", 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed projects slug page")

# Fix contact page
content = open("src/app/contact/page.tsx", 'r', encoding='utf-8').read()
content = content.replace('className\u5de8\u91cf;', 'className="space-y-6"')
with open("src/app/contact/page.tsx", 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed contact page")

# Fix Projects section
content = open("src/app/sections/Projects.tsx", 'r', encoding='utf-8').read()
content = content.replace('mb-16<Dtype>', 'mb-16">')
with open("src/app/sections/Projects.tsx", 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Projects section")

print("All fixes applied!")
