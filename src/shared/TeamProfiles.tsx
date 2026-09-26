import { assetUrl, Icon } from './ui';

type Profile = { id: string; name: string; scholar: string; role: string; specialty: string; description: string; image: string; alt: string; focus: string[] };

export function TeamProfiles({ people }: { people: Profile[] }) {
  return <div className="team-profiles">{people.map(person => <article className="team-profile" key={person.id}>
    <img src={assetUrl(person.image)} alt={person.alt} loading="lazy" width="210" height="266" />
    <div><p className="team-specialty">{person.specialty}</p><h3>{person.name}</h3><p className="team-role">{person.role}</p><p className="team-description">{person.description}</p><ul>{person.focus.map(skill => <li key={skill}>{skill}</li>)}</ul><a className="team-scholar" href={person.scholar} target="_blank" rel="noopener noreferrer">Google Scholar <Icon name="diagonal" /></a></div>
  </article>)}</div>;
}
