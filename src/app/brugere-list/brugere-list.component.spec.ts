import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrugereListComponent } from './brugere-list.component';

describe('BrugereListComponent', () => {
  let component: BrugereListComponent;
  let fixture: ComponentFixture<BrugereListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrugereListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrugereListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
