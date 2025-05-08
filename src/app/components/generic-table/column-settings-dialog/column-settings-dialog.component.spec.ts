import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColumnSettingsDialogComponent } from './column-settings-dialog.component';

describe('ColumnSettingsDialogComponent', () => {
  let component: ColumnSettingsDialogComponent;
  let fixture: ComponentFixture<ColumnSettingsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnSettingsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColumnSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
