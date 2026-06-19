import os
import re

base_dir = "src"
replacements = {
    'text-gray-400': 'text-gray-500 dark:text-gray-400',
    'bg-gray-900': 'bg-gray-100 dark:bg-gray-900',
    'bg-black/80': 'bg-black/40 dark:bg-black/80',
    'bg-black/50': 'bg-black/30 dark:bg-black/50',
    'bg-black/30': 'bg-black/20 dark:bg-black/30',
    'text-white': 'text-gray-900 dark:text-white',
    'bg-white/5': 'bg-gray-100 dark:bg-white/5',
    'bg-white/10': 'bg-gray-200 dark:bg-white/10',
    'border-white/10': 'border-gray-200 dark:border-white/10',
    'border-white/20': 'border-gray-300 dark:border-white/20',
}

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            for old, new in replacements.items():
                if old in content:
                    content = content.replace(old, new)
                    modified = True
            
            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed {filepath}")

print("Theme fix complete!")
