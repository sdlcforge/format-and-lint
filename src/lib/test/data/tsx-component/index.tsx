interface CardProps {
  title: string
}

const Card = ({ title }: CardProps): JSX.Element => {
return <div className="card"><h1>{title}</h1></div>
}

export { Card }
