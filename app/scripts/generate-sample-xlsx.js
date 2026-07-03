const ExcelJS = require('exceljs');
const path = require('path');

async function generateXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stops Manifest');

  worksheet.columns = [
    { header: 'Address', key: 'address', width: 50 }
  ];

  worksheet.addRow({ address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043' });
  worksheet.addRow({ address: '1 Infinite Loop, Cupertino, CA 95014' });
  worksheet.addRow({ address: '350 Fifth Ave, New York, NY 10118' });

  // Make the header bold
  worksheet.getRow(1).font = { bold: true };

  const outputPath = path.join(__dirname, '..', 'assets', 'sample-route-manifest.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('Successfully generated sample-route-manifest.xlsx at', outputPath);
}

generateXlsx().catch(console.error);
