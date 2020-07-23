import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferaterListComponent } from './referater-list.component';

describe('ReferaterListComponent', () => {
  let component: ReferaterListComponent;
  let fixture: ComponentFixture<ReferaterListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReferaterListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReferaterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
