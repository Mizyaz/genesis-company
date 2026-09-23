import { assetUrl } from './ui';

type Profile = { role: string; specialty: string; description: string; image: string; alt: string; focus: string[] };

export function TeamProfiles({ people }: { people: Profile[] }) {
  return <div className="team-profiles">{people.map(person => <article className="team-profile" key={person.role}>
    <img src={assetUrl(person.image)} alt={person.alt} loading="lazy" width="210" height="266" />
    <div><p className="team-specialty">{person.specialty}</p><h3>{person.role}</h3><p>{person.description}</p><ul>{person.focus.map(skill => <li key={skill}>{skill}</li>)}</ul></div>
  </article>)}</div>;
}
