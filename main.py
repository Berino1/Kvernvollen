print("DIGITAL NARKOTIKASTASJON STARTER")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

# -------------------------------------------------
# APP
# -------------------------------------------------

app = FastAPI(title="Digital Narkotikastasjon Vennesla")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///database.db"
engine = create_engine(DATABASE_URL, echo=False)


# -------------------------------------------------
# DATABASE MODELLER
# -------------------------------------------------

class Lomme(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    medisin: str = ""
    styrke: float = 0
    antall: int = 0


class Uttak(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lomme_id: int
    pasient: str
    ln: str
    antall: int
    signatur1: str
    signatur2: str
    tidspunkt: datetime = Field(default_factory=datetime.utcnow)


class Paafyll(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lomme_id: int
    medisin: str
    styrke: float
    antall: int
    signatur1: str
    signatur2: str
    tidspunkt: datetime = Field(default_factory=datetime.utcnow)


# -------------------------------------------------
# REQUEST MODELLER (API INPUT)
# -------------------------------------------------

class PaafyllRequest(BaseModel):
    lomme_id: int
    medisin: str
    styrke: float
    antall: int
    signatur1: str
    signatur2: str


class UttakRequest(BaseModel):
    lomme_id: int
    pasient: str
    ln: str
    antall: int
    signatur1: str
    signatur2: str


# -------------------------------------------------
# STARTUP
# -------------------------------------------------

@app.on_event("startup")
def startup():

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:

        finnes = session.exec(select(Lomme)).first()

        if not finnes:
            for i in range(1, 101):
                session.add(Lomme(id=i))

            session.commit()


# -------------------------------------------------
# ENDPOINTS
# -------------------------------------------------

@app.get("/")
def root():
    return {"status": "Digital Narkotikastasjon er aktiv"}


# -------------------------------------------------
# HENT LOMMER
# -------------------------------------------------

@app.get("/lommer", response_model=List[Lomme])
def hent_lommer():

    with Session(engine) as session:
        return session.exec(select(Lomme)).all()


# -------------------------------------------------
# PÅFYLL
# -------------------------------------------------

@app.post("/paafyll")
def paafyll(data: PaafyllRequest):

    if data.signatur1 == data.signatur2:
        raise HTTPException(
            status_code=400,
            detail="To forskjellige ansatte må signere"
        )

    if data.antall <= 0:
        raise HTTPException(
            status_code=400,
            detail="Antall må være større enn 0"
        )

    with Session(engine) as session:

        lomme = session.get(Lomme, data.lomme_id)

        if not lomme:
            raise HTTPException(
                status_code=404,
                detail="Lomme finnes ikke"
            )

        lomme.medisin = data.medisin
        lomme.styrke = data.styrke
        lomme.antall += data.antall

        logg = Paafyll(
            lomme_id=data.lomme_id,
            medisin=data.medisin,
            styrke=data.styrke,
            antall=data.antall,
            signatur1=data.signatur1,
            signatur2=data.signatur2
        )

        session.add(lomme)
        session.add(logg)
        session.commit()

        return {"status": "Påfyll registrert"}


# -------------------------------------------------
# UTTAK
# -------------------------------------------------

@app.post("/uttak")
def uttak(data: UttakRequest):

    if data.signatur1 == data.signatur2:
        raise HTTPException(
            status_code=400,
            detail="To forskjellige ansatte må signere"
        )

    if data.antall <= 0:
        raise HTTPException(
            status_code=400,
            detail="Antall må være større enn 0"
        )

    with Session(engine) as session:

        lomme = session.get(Lomme, data.lomme_id)

        if not lomme:
            raise HTTPException(
                status_code=404,
                detail="Lomme finnes ikke"
            )

        if lomme.antall < data.antall:
            raise HTTPException(
                status_code=400,
                detail="Ikke nok tabletter i lommen"
            )

        lomme.antall -= data.antall

        nytt_uttak = Uttak(
            lomme_id=data.lomme_id,
            pasient=data.pasient,
            ln=data.ln,
            antall=data.antall,
            signatur1=data.signatur1,
            signatur2=data.signatur2
        )

        session.add(lomme)
        session.add(nytt_uttak)
        session.commit()

        return {"status": "Uttak registrert"}


# -------------------------------------------------
# LOGG
# -------------------------------------------------

@app.get("/logg/uttak", response_model=List[Uttak])
def hent_uttak_logg():

    with Session(engine) as session:
        return session.exec(select(Uttak)).all()


@app.get("/logg/paafyll", response_model=List[Paafyll])
def hent_paafyll_logg():

    with Session(engine) as session:
        return session.exec(select(Paafyll)).all()
