#!/usr/bin/env python3
# Turns the Chrome manifest into Firefox's: a background script instead of the service worker, the add-on ID Mozilla
# signs it under, host access granted at install, and no data collection declared.
import json, sys
m = json.load(open(sys.argv[1]))
m['background'] = {'scripts': [m['background']['service_worker']]}
m['host_permissions'] = sorted({u.split('/saw/')[0] + '/*' for cs in m['content_scripts'] for u in cs['matches']})   # /rest/ too
m['browser_specific_settings'] = {'gecko': {'id': 'otsm-banner@trevman.com', 'strict_min_version': '128.0',
                                            'data_collection_permissions': {'required': ['none']}}}
json.dump(m, sys.stdout, indent=2)
print()
