import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update non-admin device check messages to all say Unauthorized device
old = """      } else {
        // Non-admin - check status
        if (device.status === 'pending') {
          return res.status(403).json({
            message: 'DEVICE_PENDING',
            description: 'Your device is pending admin approval. Please contact your administrator.'
          });
        }
        if (device.status === 'rejected') {
          return res.status(403).json({
            message: 'DEVICE_REJECTED',
            description: 'Your device has been rejected. Please contact your administrator.'
          });
        }
        if (device.status === 'approved' && !device.isActive) {
          return res.status(403).json({
            message: 'DEVICE_DEACTIVATED',
            description: 'This device has been deactivated. Please contact your administrator.'
          });
        }"""

new = """      } else {
        // Non-admin - check status
        if (device.status === 'pending') {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }
        if (device.status === 'rejected') {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }
        if (device.status === 'approved' && !device.isActive) {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }"""

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated login messages')
else:
    print('Pattern not found')
