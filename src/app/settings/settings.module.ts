import { NgModule } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { SharedModule } from '../shared';
import { SettingsRoutingModule } from './settings-routing.module';
import { EditorHelper } from '../shared/editor-helper';

@NgModule({
  imports: [
    SharedModule,
    SettingsRoutingModule
  ],
  declarations: [
    SettingsComponent
  ],
  providers: [
    EditorHelper
  ]
})

export class SettingsModule {}
