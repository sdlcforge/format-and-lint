type Id = string

interface Box<T> {
  value: T
}

const identity = <T>(value: T): T => value

enum Color {
  Red,
  Green,
  Blue
}

class Widget {
  private readonly id: Id
  public label: string

  constructor(id: Id, label: string) {
    this.id = id
    this.label = label
  }

  describe(): string {
    return `${this.label} (${this.id})`
  }
}

const box: Box<Widget> = { value : new Widget('w1', 'Gadget') }

const favorite: Color = Color.Green

export { box, favorite, identity, Widget }
