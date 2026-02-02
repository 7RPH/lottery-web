import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// 仅导出Excel文件
async function exportExcelOnly() {
  try {
    // 读取原始Excel文件
    let originalData = JSON.parse(localStorage.getItem("excelData"));
    if (!originalData) {
      alert('没有找到原始数据，请重新上传Excel文件');
      return;
    }

    // 检查原始数据格式
    if (!Array.isArray(originalData) || originalData.length < 2) {
      alert('原始数据格式错误，请重新上传Excel文件');
      return;
    }

    // 获取列名
    const originColumns = originalData.shift();
    if (!Array.isArray(originColumns)) {
      alert('原始数据格式错误，缺少列名');
      return;
    }

    // 获取自定义列
    const customColumnsStr = localStorage.getItem("customColumns");
    if (!customColumnsStr) {
      alert('没有找到自定义列设置，请重新配置');
      return;
    }
    const customColumns = JSON.parse(customColumnsStr);
    if (!Array.isArray(customColumns) || customColumns.length === 0) {
      alert('自定义列设置错误，请重新配置');
      return;
    }

    // 检查抽签结果
    const randomResultStr = localStorage.getItem("randomResult");
    if (!randomResultStr) {
      alert('没有找到抽签结果，请先进行抽签');
      return;
    }

    // 为每行数据添加自定义列和随机值
    const exportData = originalData.map((row, index) => {
      const newRow = {};
      for (let i = 0; i < originColumns.length; i++) {
        newRow[originColumns[i]] = row[i];
      }
      // 添加自定义列
      customColumns.forEach((colName) => {
        try {
          newRow[colName] = getRandomResult(index);
        } catch (err) {
          newRow[colName] = '';
          console.error('获取抽签结果失败:', err);
        }
      });

      return newRow;
    });

    // 排序
    try {
      exportData.sort((a, b) => {
        return a[customColumns[0]] - b[customColumns[0]]; 
      });
    } catch (err) {
      console.error('排序失败:', err);
    }
    
    // 补0
    let startNumber = parseInt(localStorage.getItem("start")) || 1;
    let signCount = parseInt(localStorage.getItem("enumCount")) || exportData.length;
    let title = localStorage.getItem("title") || '抽签结果';
    let maxDigits = String(signCount + startNumber).length;
    exportData.forEach((row) => {
      customColumns.forEach(customColumn => {
        if (row[customColumn] !== undefined) {
          row[customColumn] = String(row[customColumn]).padStart(maxDigits, '0');
        }
      });
    });

    // 创建新的 ExcelJS 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);
    const headers = [...originColumns, ...customColumns, "确认签字"];
    let nowCell = worksheet.getCell("A1");
    worksheet.mergeCells(1, 1, 1, headers.length);
    
    // 添加表头
    nowCell.value = title;
    worksheet.addRow(headers);

    // 添加数据
    exportData.forEach(row => {
      const rowData = headers.map(col => row[col] || '          ');
      worksheet.addRow(rowData);
    });

    // 样式设置
    worksheet.eachRow((row, rowNumber) =>{
      row.font = {name: '仿宋', size: 14, bold: false};
      row.font.size = rowNumber > 1? 14:18;
      row.font.bold = rowNumber > 2? false:true;
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });
    
    worksheet.columns.forEach(column => {
      try {
        const lengths = column.values.map((v, index) => {
          if (index <= 1) return 0;
          if (!v) return 0;
          const str = v.toString();
          let length = 0;
          for (let char of str) {
            // 判断字符是否为中文
            if (/[\u4e00-\u9fa5]/.test(char)) {
              length += 2; // 中文字符宽度为2
            } else {
              length += 1; // 英文字符宽度为1
            }
          }
          return length;
        });
        const maxLength = Math.max(...lengths.filter(v => typeof v === 'number')) + 10;
        column.width = maxLength;
        column.alignment = {vertical: "middle", horizontal: "center"};
      } catch (err) {
        console.error('设置列宽失败:', err);
        column.width = 15;
        column.alignment = {vertical: "middle", horizontal: "center"};
      }
    });

    // 导出Excel文件
    try {
      const excelBuffer = await workbook.xlsx.writeBuffer();
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveFile(excelBlob, `${title}.xlsx`);
    } catch (err) {
      alert('生成Excel文件失败: ' + err.message);
      console.error('导出Excel失败:', err);
    }

  } catch (error) {
    alert('导出Excel失败: ' + error.message);
    console.error('导出Excel失败:', error);
  }
}

// 仅导出PDF文件
async function exportPDFOnly() {
  try {
    // 读取原始Excel文件
    let originalData = JSON.parse(localStorage.getItem("excelData"));
    if (!originalData) {
      alert('没有找到原始数据，请重新上传Excel文件');
      return;
    }

    // 检查原始数据格式
    if (!Array.isArray(originalData) || originalData.length < 2) {
      alert('原始数据格式错误，请重新上传Excel文件');
      return;
    }

    // 获取列名
    const originColumns = originalData.shift();
    if (!Array.isArray(originColumns)) {
      alert('原始数据格式错误，缺少列名');
      return;
    }

    // 获取自定义列
    const customColumnsStr = localStorage.getItem("customColumns");
    if (!customColumnsStr) {
      alert('没有找到自定义列设置，请重新配置');
      return;
    }
    const customColumns = JSON.parse(customColumnsStr);
    if (!Array.isArray(customColumns) || customColumns.length === 0) {
      alert('自定义列设置错误，请重新配置');
      return;
    }

    // 检查抽签结果
    const randomResultStr = localStorage.getItem("randomResult");
    if (!randomResultStr) {
      alert('没有找到抽签结果，请先进行抽签');
      return;
    }

    // 为每行数据添加自定义列和随机值
    const exportData = originalData.map((row, index) => {
      const newRow = {};
      for (let i = 0; i < originColumns.length; i++) {
        newRow[originColumns[i]] = row[i];
      }
      // 添加自定义列
      customColumns.forEach((colName) => {
        try {
          newRow[colName] = getRandomResult(index);
        } catch (err) {
          newRow[colName] = '';
          console.error('获取抽签结果失败:', err);
        }
      });
      newRow["确认签字"] = "          ";
      return newRow;
    });

    // 排序
    try {
      exportData.sort((a, b) => {
        return a[customColumns[0]] - b[customColumns[0]]; 
      });
    } catch (err) {
      console.error('排序失败:', err);
    }
    
    // 补0
    let startNumber = parseInt(localStorage.getItem("start")) || 1;
    let signCount = parseInt(localStorage.getItem("enumCount")) || exportData.length;
    let title = localStorage.getItem("title") || '抽签结果';
    let maxDigits = String(signCount + startNumber).length;
    exportData.forEach((row) => {
      customColumns.forEach(customColumn => {
        if (row[customColumn] !== undefined) {
          row[customColumn] = String(row[customColumn]).padStart(maxDigits, '0');
        }
      });
    });

    const headers = [...originColumns, ...customColumns, "确认签字"];
    
    // 导出PDF
    try {
      exportToPDF(headers, exportData, title);
    } catch (err) {
      alert('生成PDF文件失败: ' + err.message);
      console.error('导出PDF失败:', err);
    }

    } catch (error) {
    alert('导出PDF失败: ' + error.message);
    console.error('导出PDF失败:', error);
  }
}

// 创建PDF文件并导出
function exportToPDF(headers, data, title) {
  try {
    // 创建PDF文档，设置为横向A4大小
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4'
    });
    // 设置文档属性
    pdf.setProperties({
      title: title,
      creator: '抽签系统',
      subject: '抽签结果'
    });
    
    // 添加文档标题
    pdf.setFont('SimFang', 'bold');
    pdf.setFontSize(18); // 与Excel标题字体大小一致
    pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // 准备表格数据
    const tableData = data.map(row => headers.map(header => row[header] || ''));
    
    // 获取自定义列以设置居中对齐
    const customColumnsStr = localStorage.getItem("customColumns");
    let customColumns = [];
    if (customColumnsStr) {
      try {
        customColumns = JSON.parse(customColumnsStr);
      } catch (err) {
        console.error('解析自定义列失败:', err);
      }
    }
    const columnStyles = {};
    
    // 为所有列设置样式
    headers.forEach((header, i) => {
      // 基本样式：所有单元格都有边框
      columnStyles[i] = { 
        cellWidth: 'auto',
        cellPadding: 2,
        lineWidth: 0.5, // 细边框
        lineColor: [0, 0, 0], // 黑色边框
        font: 'SimFang'
      };
      
      // 为数字列设置居中对齐
      if (Array.isArray(customColumns) && customColumns.includes(header)) {
        columnStyles[i].halign = 'center';
      }
    });
    
    // 创建表格
    autoTable(pdf, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fillColor: [255, 255, 255], // 白色背景
        font: 'SimFang', // 使用与Excel相同的中文字体
        fontSize: 14, // 与Excel正文字体大小一致
        cellPadding: 3,
        lineWidth: 0.5, // 细边框
        lineColor: [0, 0, 0], // 黑色边框
        textColor: [0, 0, 0], 
        valign: 'middle', // 垂直居中, 
        halign: 'center'
      },
      headStyles: {
        halign: 'center', 
        valign: 'middle', 
        fillColor: [255, 255, 255], // 白色背景
        textColor: [0, 0, 0], // 黑色文字
        fontStyle: 'bold',
        lineWidth: 0.5, // 细边框
        lineColor: [0, 0, 0], // 黑色边框
        font: 'SimFang',
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255] // 确保交替行也是白色
      },
      columnStyles: columnStyles,
      rowPageBreak: 'avoid',
      didDrawPage: (data) => {
        // 获取当前页码
        const currentPage = pdf.internal.getCurrentPageInfo().pageNumber;
        
        // 根据页码设置不同的上边距
        if (currentPage > 1) {
          // 从第二页开始使用较小的上边距
          data.settings.margin.top = 35;
          
          // 因为是新页面，需要设置表头的Y位置
          data.cursor.y = 35;
        }
        // 添加页脚
        pdf.setFontSize(10);
        pdf.text(
          `${title} - 第 ${pdf.internal.getNumberOfPages()} 页`, 
          pdf.internal.pageSize.getWidth() / 2, 
          pdf.internal.pageSize.getHeight() - 10, 
          { align: 'center' }
        );
      },
      // 表格绘制完成后执行
      didDrawCell: (data) => {
        try {
          // 为单元格添加边框
          const cell = data.cell;
          if (cell.section === 'body') {
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.line(cell.x, cell.y, cell.x + cell.width, cell.y); // 上边框
            pdf.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height); // 下边框
            pdf.line(cell.x, cell.y, cell.x, cell.y + cell.height); // 左边框
            pdf.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height); // 右边框
          }
        } catch (err) {
          console.error('绘制单元格边框失败:', err);
        }
      },
      willDrawCell: (data) => {
        try {
          // 根据内容自动调整列宽
          const cell = data.cell;
          if (cell.text) {
            // 特殊处理中文字符，使其有更合适的宽度
            const text = cell.text.toString();
            let count = 0;
            for (let i = 0; i < text.length; i++) {
              count += /[\u4e00-\u9fa5]/.test(text[i]) ? 2 : 1;
            }
          }
        } catch (err) {
          console.error('处理单元格绘制失败:', err);
        }
      },
      // 设置页边距，确保符合A4打印要求
      margin: { top: 40, right: 30, bottom: 25, left: 30 },
      // 确保表格适应页面宽度
      tableWidth: 'auto',
      // 自动分页处理
      showHead: 'everyPage'
    });
    
    // 保存PDF文件
    pdf.save(`${title}.pdf`);
  } catch (error) {
    alert('生成PDF文件失败: ' + error.message);
    console.error('导出PDF失败:', error);
  }
}

// 辅助函数：保存文件
function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 获取用户中奖的奖项名称
function getPrizeName(row) {
  // 根据用户选择的数据列获取识符
    const selectedColumn = document.querySelector('select[name="dataColumn"]').value;
  const identifier = row[Object.keys(row)[selectedColumn]];

  // 在中奖记录中查找
  for (const [type, users] of Object.entries(basicData.luckyUsers)) {
    if (users.some(u => u[0] === String(identifier))) {
      const prize = basicData.prizes.find(p => p.type === parseInt(type));
      return prize ? prize.title : '未中奖';
    }
  }
  return '未中奖';
}

// 获取抽签结果
function getRandomResult(index) {
  const arr = JSON.parse(localStorage.getItem("randomResult"));
  const append = parseInt(localStorage.getItem("start"));
  // console.log(arr, index);
  return arr[index] + append - 1;
}

export {
  exportExcelOnly,
  exportPDFOnly,
  exportToPDF,
  saveFile,
  getPrizeName,
  getRandomResult
};