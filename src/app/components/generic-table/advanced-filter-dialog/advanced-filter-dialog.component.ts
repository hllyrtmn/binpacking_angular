import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdvancedFilter } from '../generic-table.component';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-advanced-filter-dialog',
  imports: [ CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule],
  templateUrl: './advanced-filter-dialog.component.html',
  styleUrl: './advanced-filter-dialog.component.scss'
})
/**
 * Gelişmiş filtreleme için diyalog bileşeni.
 * Farklı sütunlar için çeşitli filtreleme koşulları oluşturmayı sağlar.
 */
export class AdvancedFilterDialogComponent {
  filterForm: FormGroup;
  filters: AdvancedFilter[] = [];
  filterLogic: 'and' | 'or' = 'and'; // Filtreleme mantığı (VE/VEYA)

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AdvancedFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Form oluştur
    this.filterForm = this.fb.group({
      column: ['', Validators.required],
      type: ['contains', Validators.required],
      value: ['', Validators.required],
      valueEnd: ['']
    });

    // Mevcut filtreleri yükle
    if (data.currentFilters && data.currentFilters.length > 0) {
      this.filters = [...data.currentFilters];
    }

    // Filtreleme mantığını yükle
    if (data.filterLogic) {
      this.filterLogic = data.filterLogic;
    }
  }

  /**
   * Sütun değişikliğinde sütun tipine göre işlemi güncelle
   */
  onColumnChange(): void {
    const columnKey = this.filterForm.get('column')?.value;
    const column = this.data.columns.find((col: any) => col.key === columnKey);

    // Sütun tipine göre varsayılan işlemi ayarla
    if (column) {
      let defaultOperator = 'contains';

      switch (column.type) {
        case 'number':
        case 'currency':
          defaultOperator = 'equals';
          break;
        case 'date':
          defaultOperator = 'equals';
          break;
        default:
          defaultOperator = 'contains';
      }

      this.filterForm.get('type')?.setValue(defaultOperator);

      // Değerleri sıfırla
      this.filterForm.get('value')?.setValue('');
      this.filterForm.get('valueEnd')?.setValue('');
    }
  }

  /**
   * İşlem değişikliğinde gereken validasyonları güncelle
   */
  onOperatorChange(): void {
    const operator = this.filterForm.get('type')?.value;

    if (operator === 'between') {
      this.filterForm.get('valueEnd')?.setValidators([Validators.required]);
    } else {
      this.filterForm.get('valueEnd')?.clearValidators();
      this.filterForm.get('valueEnd')?.setValue('');
    }

    this.filterForm.get('valueEnd')?.updateValueAndValidity();
  }

  /**
   * Seçilen sütunun metin türünde olup olmadığını kontrol eder
   */
  isTextColumn(): boolean {
    const columnKey = this.filterForm.get('column')?.value;
    if (!columnKey) return true; // Varsayılan olarak metin türünü göster

    const column = this.data.columns.find((col: any) => col.key === columnKey);

    return !column || column.type === 'text' || column.type === undefined || column.type === 'custom';
  }

  /**
   * Seçilen sütunun sayısal türde olup olmadığını kontrol eder
   */
  isNumberColumn(): boolean {
    const columnKey = this.filterForm.get('column')?.value;
    if (!columnKey) return false;

    const column = this.data.columns.find((col: any) => col.key === columnKey);

    return column && (column.type === 'number' || column.type === 'currency' || column.type === 'percent');
  }

  /**
   * Seçilen sütunun tarih türünde olup olmadığını kontrol eder
   */
  isDateColumn(): boolean {
    const columnKey = this.filterForm.get('column')?.value;
    if (!columnKey) return false;

    const column = this.data.columns.find((col: any) => col.key === columnKey);

    return column && column.type === 'date';
  }

  /**
   * Seçilen işlemin aralık (between) olup olmadığını kontrol eder
   */
  isBetweenOperator(): boolean {
    return this.filterForm.get('type')?.value === 'between';
  }

  /**
   * Formun geçerli olup olmadığını kontrol eder
   */
  isFormValid(): boolean {
    if (!this.filterForm.valid) return false;

    // "between" seçiliyse ikinci değerin de girilmiş olması gerekir
    if (this.isBetweenOperator()) {
      const endValue = this.filterForm.get('valueEnd')?.value;
      return endValue !== null && endValue !== undefined && endValue !== '';
    }

    return true;
  }

  /**
   * Sütun adını döndürür
   * @param columnKey Sütun anahtarı
   */
  getColumnLabel(columnKey: string): string {
    const column = this.data.columns.find((col: any) => col.key === columnKey);
    return column ? column.label : columnKey;
  }

  /**
   * İşlem adını döndürür
   * @param type İşlem türü
   */
  getOperatorLabel(type: string): string {
    switch (type) {
      case 'contains': return 'içerir';
      case 'equals': return 'eşittir';
      case 'startsWith': return 'ile başlar';
      case 'endsWith': return 'ile biter';
      case 'greaterThan': return 'büyüktür';
      case 'lessThan': return 'küçüktür';
      case 'between': return 'aralığında';
      default: return type;
    }
  }

  /**
   * Filtre değerini formatlar
   * @param filter Filtre
   */
  formatFilterValue(filter: AdvancedFilter): string {
    // Eğer aralık filtresi ise
    if (filter.type === 'between' && filter.valueEnd !== undefined) {
      return `${filter.value} - ${filter.valueEnd}`;
    }

    // Tarih formatı
    const columnInfo = this.data.columns.find((col: any) => col.key === filter.column);
    if (columnInfo && columnInfo.type === 'date' && filter.value) {
      try {
        // Tarih stringini Date nesnesine çevir
        const date = new Date(filter.value);
        return date.toLocaleDateString();
      } catch (e) {
        return String(filter.value);
      }
    }

    // Para birimi formatı
    if (columnInfo && columnInfo.type === 'currency' && filter.value) {
      try {
        const value = Number(filter.value);
        return value.toLocaleString(undefined, {
          style: 'currency',
          currency: columnInfo.format || 'TRY'
        });
      } catch (e) {
        return String(filter.value);
      }
    }

    return String(filter.value);
  }

  /**
   * Filtre açıklamasını döndürür (tooltip için)
   * @param filter Filtre
   */
  getFilterDescription(filter: AdvancedFilter): string {
    return `${this.getColumnLabel(filter.column)} ${this.getOperatorLabel(filter.type)} ${this.formatFilterValue(filter)}`;
  }

  /**
   * Yeni filtre ekler
   */
  addFilter(): void {
    if (!this.isFormValid()) return;

    const columnKey = this.filterForm.get('column')?.value;
    if (!columnKey) return;

    const column = this.data.columns.find((col: any) => col.key === columnKey);
    const filter: AdvancedFilter = {
      column: columnKey,
      type: this.filterForm.get('type')?.value,
      value: this.filterForm.get('value')?.value
    };

    // Aralık filtresi için ikinci değeri ekle
    if (filter.type === 'between') {
      filter.valueEnd = this.filterForm.get('valueEnd')?.value;
    }

    // Tarih değerlerini formatla
    if (column && column.type === 'date') {
      // Tarih değerlerini string formatına çevir
      if (filter.value instanceof Date) {
        filter.value = filter.value.toISOString();
      }
      if (filter.valueEnd instanceof Date) {
        filter.valueEnd = filter.valueEnd.toISOString();
      }
    }

    // Filtreyi ekle
    this.filters.push(filter);

    // Formu sıfırla (sütun ve işlem türü korunur)
    this.filterForm.get('value')?.setValue('');
    this.filterForm.get('valueEnd')?.setValue('');
  }

  /**
   * Filtreyi kaldırır
   * @param index Filtre indeksi
   */
  removeFilter(index: number): void {
    this.filters.splice(index, 1);
  }

  /**
   * Tüm filtreleri temizler
   */
  clearAllFilters(): void {
    this.filters = [];
  }

  /**
   * Filtreleri kaydeder ve diyaloğu kapatır
   */
  saveFilters(): void {
    this.dialogRef.close({
      filters: this.filters,
      logic: this.filterLogic
    });
  }
}
