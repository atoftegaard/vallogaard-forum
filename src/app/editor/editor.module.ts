import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import { EditableArticleResolver } from './editable-article-resolver.service';
import { SharedModule } from '../shared';
import { EditorRoutingModule } from './editor-routing.module';
import { FroalaEditorModule, FroalaViewModule } from 'angular-froala-wysiwyg';

@NgModule({
  imports: [
    SharedModule,
     EditorRoutingModule,
     FroalaEditorModule.forRoot(),
     FroalaViewModule.forRoot()],
  declarations: [EditorComponent],
  providers: [EditableArticleResolver],
  exports: [
    FroalaEditorModule,
    FroalaViewModule
  ]
})
export class EditorModule {}
