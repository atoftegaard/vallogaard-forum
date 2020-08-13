import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DokumentPreviewComponent } from './dokument-preview.component';

describe('DokumentPreviewComponent', () => {
  let component: DokumentPreviewComponent;
  let fixture: ComponentFixture<DokumentPreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DokumentPreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DokumentPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
