interface GreetingProps {
  name: string
  count?: number
}

const Greeting = ({ name, count = 0 }: GreetingProps): JSX.Element => (
  <div className="greeting">
    <span>{`Hello, ${name}!`}</span>
    {count > 0 && <span>{`(${count})`}</span>}
  </div>
)

export { Greeting }
