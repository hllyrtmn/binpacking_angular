import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Verileri CSV formatında dışa aktarır
   * @param data Veri dizisi
   * @param headers Sütun başlıkları
   * @param filename Dosya adı
   */
  exportToCsv(data: any[], headers: string[], filename: string = 'export'): void {
    if (!data || !data.length) {
      console.warn('ExportService: Dışa aktarılacak veri bulunamadı.');
      return;
    }

    try {
      // CSV başlık satırını oluştur
      let csvContent = headers.join(',') + '\n';

      // Her bir satır için
      data.forEach(item => {
        // Sütun değerlerini al
        const values = headers.map(header => {
          const value = item[header];
          // Değer virgül içeriyorsa veya string ise çift tırnak içine al
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });

        // Satırı CSV içeriğine ekle
        csvContent += values.join(',') + '\n';
      });

      // CSV dosyasını indir
      this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');

      console.log(`ExportService: Veriler başarıyla CSV olarak dışa aktarıldı. (${filename}.csv)`);
    } catch (error) {
      console.error('ExportService: CSV dışa aktarma hatası:', error);
    }
  }

  /**
   * Verileri Excel formatında dışa aktarır
   * @param data Veri dizisi
   * @param headers Sütun başlıkları
   * @param filename Dosya adı
   */
  exportToExcel(data: any[], headers: string[], filename: string = 'export'): void {
    if (!data || !data.length) {
      console.warn('ExportService: Dışa aktarılacak veri bulunamadı.');
      return;
    }

    try {
      // Excel oluşturmak için SheetJS (xlsx) kütüphanesini kullan
      if (typeof XLSX !== 'undefined') {
        // Excel çalışma kitabı oluştur
        const worksheet = XLSX.utils.json_to_sheet(
          data.map(item => {
            const row: any = {};
            headers.forEach(header => {
              const headerParts = header.split('.');
              let value = item;

              // İç içe nesne özelliklerini al
              for (const part of headerParts) {
                if (value && typeof value === 'object') {
                  value = value[part];
                } else {
                  value = '';
                  break;
                }
              }

              row[header] = value;
            });
            return row;
          })
        );

        // Sütun başlıklarını ayarla
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headerRow = {};

        headers.forEach((header, index) => {
          const cell = XLSX.utils.encode_cell({ r: 0, c: index });
          worksheet[cell].v = header;
        });

        // Çalışma kitabı oluştur ve dosyayı indir
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, `${filename}.xlsx`);

        console.log(`ExportService: Veriler başarıyla Excel olarak dışa aktarıldı. (${filename}.xlsx)`);
      } else {
        // SheetJS mevcut değilse CSV olarak dışa aktar
        console.warn('ExportService: XLSX kütüphanesi bulunamadı. Veriler CSV olarak dışa aktarılıyor.');
        this.exportToCsv(data, headers, filename + '_excel');
      }
    } catch (error) {
      console.error('ExportService: Excel dışa aktarma hatası:', error);

      // Hata durumunda CSV olarak dışa aktar
      console.warn('ExportService: Excel dışa aktarma başarısız oldu. Veriler CSV olarak dışa aktarılıyor.');
      this.exportToCsv(data, headers, filename + '_excel');
    }
  }

  /**
   * Verileri PDF formatında dışa aktarır
   * @param data Veri dizisi
   * @param headers Sütun başlıkları
   * @param title Doküman başlığı
   * @param filename Dosya adı
   */
  exportToPdf(data: any[], headers: string[], title: string, filename: string = 'export'): void {
    if (!data || !data.length) {
      console.warn('ExportService: Dışa aktarılacak veri bulunamadı.');
      return;
    }

    try {
      // PDF oluşturmak için jsPDF ve jsPDF-AutoTable kütüphanelerini kullan
      if (typeof jsPDF !== 'undefined' && typeof 'jspdf-autotable' !== 'undefined') {
        // PDF dokümanı oluştur
        const doc = new jsPDF();

        // Başlık ekle
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);

        // Tarih ekle
        const now = new Date();
        doc.text(
          `Oluşturulma Tarihi: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          14,
          30
        );

        // Verileri formatla
        const tableData = data.map(item => {
          return headers.map(header => {
            // İç içe nesne özelliklerini al
            const headerParts = header.split('.');
            let value = item;

            for (const part of headerParts) {
              if (value && typeof value === 'object') {
                value = value[part];
              } else {
                value = '';
                break;
              }
            }

            return value;
          });
        });

        // Sütun başlıklarını formatla
        const headerLabels = headers.map(header => {
          // Sütun adını formatla
          return header
            .replace(/\./g, ' ')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        });

        // Tabloyu oluştur
        (doc as any).autoTable({
          head: [headerLabels],
          body: tableData,
          startY: 40,
          margin: { top: 36 },
          styles: { overflow: 'linebreak' },
          headStyles: {
            fillColor: [41, 128, 185],
            fontSize: 12,
            halign: 'center'
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          tableLineColor: [189, 195, 199],
          tableLineWidth: 0.2,
        });

        // Sayfa numarası ekle
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);

          // Sayfa numarası ekle
          doc.text(
            `Sayfa ${i} / ${pageCount}`,
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 10
          );
        }

        // PDF dosyasını indir
        doc.save(`${filename}.pdf`);

        console.log(`ExportService: Veriler başarıyla PDF olarak dışa aktarıldı. (${filename}.pdf)`);
      } else {
        // jsPDF mevcut değilse CSV olarak dışa aktar
        console.warn('ExportService: jsPDF veya jspdf-autotable kütüphanesi bulunamadı. Veriler CSV olarak dışa aktarılıyor.');
        this.exportToCsv(data, headers, filename + '_pdf');
      }
    } catch (error) {
      console.error('ExportService: PDF dışa aktarma hatası:', error);

      // Hata durumunda CSV olarak dışa aktar
      console.warn('ExportService: PDF dışa aktarma başarısız oldu. Veriler CSV olarak dışa aktarılıyor.');
      this.exportToCsv(data, headers, filename + '_pdf');
    }
  }

  /**
   * Verileri JSON formatında dışa aktarır
   * @param data Veri dizisi
   * @param filename Dosya adı
   */
  exportToJson(data: any[], filename: string = 'export'): void {
    if (!data || !data.length) {
      console.warn('ExportService: Dışa aktarılacak veri bulunamadı.');
      return;
    }

    try {
      // JSON verilerini indirilebilir formata dönüştür
      const jsonData = JSON.stringify(data, null, 2);
      this.downloadFile(jsonData, `${filename}.json`, 'application/json');

      console.log(`ExportService: Veriler başarıyla JSON olarak dışa aktarıldı. (${filename}.json)`);
    } catch (error) {
      console.error('ExportService: JSON dışa aktarma hatası:', error);
    }
  }

  /**
   * Dosya indirme yardımcı fonksiyonu
   * @param content Dosya içeriği
   * @param filename Dosya adı
   * @param mimeType MIME türü
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');

    // Dosya URL'si oluştur
    const url = window.URL.createObjectURL(blob);

    // Link özelliklerini ayarla
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Linki ekle, tıkla ve kaldır
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // URL'yi temizle
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}
