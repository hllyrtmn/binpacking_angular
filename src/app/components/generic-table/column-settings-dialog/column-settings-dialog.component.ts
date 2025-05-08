import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-column-settings-dialog',
  imports: [CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    DragDropModule],
  templateUrl: './column-settings-dialog.component.html',
  styleUrl: './column-settings-dialog.component.scss'
})
export class ColumnSettingsDialogComponent {
  columns: {key: string, label: string, visible: boolean}[] = [];
  searchTerm: string = '';

  constructor(
    public dialogRef: MatDialogRef<ColumnSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Sütunları kopyala
    this.columns = [...data.allColumns];
  }

  /**
   * Arama terimlerine göre filtrelenmiş sütunları getir
   */
  get filteredColumns(): {key: string, label: string, visible: boolean}[] {
    if (!this.searchTerm) return this.columns;

    return this.columns.filter(col =>
      col.label.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  /**
   * Görünür sütun sayısını hesaplar
   */
  get visibleCount(): number {
    return this.columns.filter(col => col.visible).length;
  }

  /**
   * Gizli sütun sayısını hesaplar
   */
  get hiddenCount(): number {
    return this.columns.length - this.visibleCount;
  }

  /**
   * Tüm sütunlar görünür mü
   */
  get allVisible(): boolean {
    return this.visibleCount === this.columns.length;
  }

  /**
   * Hiçbir sütun görünür değil mi
   */
  get noneVisible(): boolean {
    return this.visibleCount === 0;
  }

  /**
   * Tüm sütunların görünürlüğünü toplu olarak değiştirir
   * @param visible Görünür/Gizli durumu
   */
  toggleAll(visible: boolean): void {
    this.columns.forEach(col => col.visible = visible);
  }

  /**
   * Sütun sırasını değiştirme (sürükle bırak)
   * @param event Sürükle bırak olayı
   */
  drop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
  }

  /**
   * Varsayılan ayarlara dön (tüm sütunlar görünür)
   */
  resetToDefault(): void {
    this.columns.forEach(col => col.visible = true);
  }

  /**
   * Değişiklikleri kaydet
   */
  save(): void {
    // Gizli sütunların listesini oluştur
    const hiddenColumns = this.columns
      .filter(col => !col.visible)
      .map(col => col.key);

    this.dialogRef.close(hiddenColumns);
  }
}
