import { inject, Renderer2, ElementRef, Injectable } from "@angular/core";
import { DragDrop } from "@angular/cdk/drag-drop";

export class DragDropFactory {
    counter = 0;
    dragDropService: DragDrop = inject(DragDrop)

    constructor(private renderer: Renderer2, elementRef: ElementRef) { }

    createDragDrop(element: any) {
        // each drag-drop element will have a unique id by counter
        return this.dragDropService.createDrag(element)
    }

    createDragDropDiv() {
        let div = this.renderer.createElement('div');
        this.renderer.addClass(div, 'example-list');
        this.renderer.setAttribute(div, 'id', `drag-drop-${this.counter++}`);
        let text = this.renderer.createText('Drag me!');
        this.renderer.appendChild(div, text);
        return div;
    }    //create dragdrop element

}
