import { Component, ElementRef, inject, OnInit, Renderer2, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { CdkDrag, DragDrop, DragDropModule, DragRef } from '@angular/cdk/drag-drop';
import { DragDropComponent } from './components/drag-drop/drag-drop.component';
import { DragDropFactory } from './factories/drag-drop-factory';

@Component({
  selector: 'app-test',
  imports: [MatButtonModule, DragDropComponent],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent {

  http = inject(HttpClient)
  renderer2 = inject(Renderer2)

  //Service that allows for drag-and-drop functionality to be attached to DOM elements.
  service = inject(DragDrop)

  elementRef = inject(ElementRef)
  dragDropFactory = new DragDropFactory(this.renderer2, this.elementRef)
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef


  renderer = inject(Renderer2)
  dragDropDict: { [id: number]: DragRef } = {}


  addDragDrop() {
    this.container.createComponent(DragDropComponent);
  }


  createDragDrop() {
    const element = this.dragDropFactory.createDragDropDiv();
    const targetElement = this.elementRef.nativeElement.querySelector('.example-container');
    if (targetElement) {

      console.log(targetElement)
      this.renderer2.appendChild(targetElement, element);
      return this.dragDropFactory.createDragDrop(element)
    }
    return null;

  }

}
