from pypdfium2 import PdfDocument
import os

pdf_path = r'D:/break-time-tracker-app/break-time-tracker-app/Break_Time_Tracker_User_Guide.pdf'
qa_dir = r'D:/break-time-tracker-app/break-time-tracker-app/pdf-qa'

pdf = PdfDocument(pdf_path)
print(f'Pages: {len(pdf)}')

os.makedirs(qa_dir, exist_ok=True)
for i, page in enumerate(pdf):
    bitmap = page.render(scale=2)
    pil_img = bitmap.to_pil()
    pil_img.save(os.path.join(qa_dir, f'page_{i+1:02d}.png'))

print('All pages rendered successfully.')
