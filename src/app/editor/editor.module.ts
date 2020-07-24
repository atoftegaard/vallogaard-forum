import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import { EditableArticleResolver } from './editable-article-resolver.service';
import { SharedModule } from '../shared';
import { EditorRoutingModule } from './editor-routing.module';
import { EditorModule as PrimeEditorModule} from 'primeng/editor';
import { EditorHelper } from '../shared/editor-helper';

@NgModule({
  imports: [
    SharedModule,
     EditorRoutingModule,
     PrimeEditorModule
    ],
  declarations: [EditorComponent],
  providers: [
    EditableArticleResolver,
    EditorHelper],
  exports: [
  ]
})
export class EditorModule {}
